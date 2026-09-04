'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from '@caresy/ui';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';

// Live location sharing for the assigned companion. Watches the device GPS and
// (a) writes trips.last_lat/last_lng for this booking's trip — the durable copy
//     behind get_shared_tracking's poll, and what the admin live board reads,
// (b) broadcasts on the private Realtime channel `trip:<trip_id>`, which is the
//     path a signed-in customer actually watches, and
// (c) inserts a throttled breadcrumb into trip_locations for audit (optional,
//     purged after 7d by purge_trip_locations).
//
// The topic is the TRIP id and nothing else. This used to send a second copy on
// `trip:<share_token>` to match what tracking.tsx was listening on, but the RLS
// in migration 16 resolves the topic by casting that segment to a trips.id — a
// share token is a different uuid, so both ends of that pair were denied in
// silence and only the poll ever worked. Both sides now agree on trip:<trip_id>.
//
// RLS: "Only assigned companion updates trip" (16) + "Only companion can
// broadcast location" + "Companion inserts own breadcrumb". All best-effort.
// Throttle: 12s + no duplicate if < 10m movement (cheap, good enough).
//
// Starting is automatic once the job is live (`autoStart`), because a companion
// walking into a hospital is not thinking about a button, and a family watching
// a map that never moves assumes the worst. Stopping stays manual.
//
// The honest limit: this is a browser tab. A Screen Wake Lock keeps the page
// awake while it is visible, which covers a phone sitting in a pocket with the
// screen on, but nothing here survives the companion switching apps or locking
// the device — the OS suspends the tab and pings stop. The customer's poll then
// shows a position with an ageing timestamp rather than a lie. Background
// location needs a native app; see docs/LIVE_TRACKING_HANDOFF.md next-step 6.

const MIN_WRITE_MS = 12_000;

// Module-level so both the component and its effects share one reference.
async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return null;
    return await navigator.wakeLock.request('screen');
  } catch {
    // Denied, unsupported, or the page was already hidden. Not worth surfacing:
    // sharing still works, it is just more fragile.
    return null;
  }
}

export default function LocationShare({ bookingId, autoStart }: { bookingId: string; autoStart?: boolean }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const tripId = useRef<string | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastWrite = useRef(0);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  // Auto-start fires once per mount. Without this a companion who deliberately
  // stopped sharing would have it switched back on by the next re-render.
  const autoStarted = useRef(false);

  const acquireWakeLock = useCallback(async () => {
    // A sentinel the browser already revoked (which it does on every hide) is
    // still an object. Checking `released` is what makes re-acquiring work.
    if (wakeLock.current && !wakeLock.current.released) return;
    wakeLock.current = await requestWakeLock();
  }, []);

  const stop = useCallback(() => {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    try { if (channel.current) { const supabase = createClient(); supabase.removeChannel(channel.current); } } catch {}
    channel.current = null;
    // Let the screen sleep again. Holding it past the end of a job is a battery
    // bug on a phone the companion needs for the rest of their shift.
    try { void wakeLock.current?.release(); } catch {}
    wakeLock.current = null;
    setSharing(false);
  }, []);

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    try { if (channel.current) createClient().removeChannel(channel.current); } catch {}
    try { void wakeLock.current?.release(); } catch {}
  }, []);

  // `auto` suppresses the error text. A companion who tapped the button wants to
  // know why it did nothing; a companion who tapped nothing should not be shown
  // a failure they did not cause — the button is still right there.
  const start = useCallback(async (auto = false) => {
    setError(null);
    const fail = (msg: string) => { if (!auto) setError(msg); };
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fail('Location isn’t available on this device'); return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error: e } = await supabase.from('trips').select('id')
      .eq('booking_id', bookingId).not('status', 'in', '(completed,cancelled)')
      .limit(1).maybeSingle();
    setBusy(false);
    if (e) { fail(e.message); return; }
    if (!data) { fail('No active trip for this booking yet — start the job first'); return; }
    tripId.current = (data as { id: string }).id;

    // Subscribe before sending — required by Realtime, and it is the subscribe
    // that the WITH CHECK policy is evaluated against.
    try {
      const ch = supabase.channel(`trip:${tripId.current}`, { config: { private: true } });
      ch.subscribe();
      channel.current = ch;
    } catch {}

    // Screen Wake Lock: keeps the tab from being frozen while it is on screen.
    // Not supported everywhere and revoked by the browser whenever the page is
    // hidden, so it is a best-effort improvement, never a guarantee — see the
    // header. Re-acquired by the visibilitychange effect below.
    void acquireWakeLock();

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastWrite.current < MIN_WRITE_MS) return;
        const { latitude, longitude } = pos.coords;
        // Skip if moved < 10m (cheap haversine approx) — preserve battery
        if (lastPos.current) {
          const dLat = latitude - lastPos.current.lat;
          const dLng = longitude - lastPos.current.lng;
          const approxM = Math.sqrt(dLat*dLat + dLng*dLng) * 111000;
          if (approxM < 10) return;
        }
        lastWrite.current = now;
        lastPos.current = { lat: latitude, lng: longitude };
        const at = new Date(now).toISOString();

        // (a) Durable: trips.last_lat/lng for poll fallback
        const { error: ue } = await supabase.from('trips')
          .update({ last_lat: latitude, last_lng: longitude, last_location_at: at })
          .eq('id', tripId.current!);
        if (ue) { setError(ue.message); return; }

        // (b) Realtime broadcast on the trip's own channel. The customer's poll
        // is the floor under this, so a failed send costs latency, not the pin.
        try {
          if (channel.current) {
            await channel.current.send({
              type: 'broadcast',
              event: 'location',
              payload: { last_lat: latitude, last_lng: longitude, at },
            });
          }
        } catch {}

        // (c) Breadcrumb for audit (best-effort, RLS-gated)
        try {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            // PostGIS geography(Point,4326) via WKT — Supabase postgrest will coerce string
            await supabase.from('trip_locations').insert({
              trip_id: tripId.current!,
              companion_user_id: user.id,
              location: `POINT(${longitude} ${latitude})`,
              recorded_at: at,
            } as unknown as { trip_id: string; companion_user_id: string; location: string; recorded_at: string });
          }
        } catch {}

        setError(null); setSentAt(now);
      },
      // A permission prompt denied mid-share is worth saying out loud even when
      // sharing started on its own — it is the one failure the companion can fix.
      (err) => { setError(err.message); stop(); },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    setSharing(true);
  }, [bookingId, stop, acquireWakeLock]);

  // Start on our own once the job is live. A companion arriving at a hospital
  // has their hands full; the family should not be watching a blank map because
  // nobody tapped a button.
  useEffect(() => {
    if (!autoStart || autoStarted.current || sharing || busy) return;
    autoStarted.current = true;
    void start(true);
  }, [autoStart, sharing, busy, start]);

  // The browser revokes a wake lock every time the page is hidden, so take it
  // back when the companion returns to the tab. Only while sharing.
  useEffect(() => {
    if (!sharing) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void acquireWakeLock(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sharing, acquireWakeLock]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <Button
        variant={sharing ? 'outline' : 'primary'}
        size="sm"
        disabled={busy}
        onClick={sharing ? stop : () => void start()}
        iconLeft={busy ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />
          : sharing ? <MapPinOff style={{ width: 15, height: 15 }} /> : <MapPin style={{ width: 15, height: 15 }} />}
      >
        {sharing ? 'Stop sharing' : 'Share live location'}
      </Button>
      {error ? (
        <span style={{ fontSize: '0.72rem', color: 'var(--danger, #b3261e)' }}>{error}</span>
      ) : sharing ? (
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          {sentAt ? 'Location live — sharing with the family' : 'Getting your location…'}
        </span>
      ) : autoStart && !busy ? (
        // A live job that is not sharing is the state worth shouting about: the
        // family is watching a map that will never move and has no way to know.
        <span style={{ fontSize: '0.72rem', color: 'var(--terracotta-deep, #9a4a33)', fontWeight: 700 }}>
          Not sharing — the family can’t see where you are
        </span>
      ) : null}
    </div>
  );
}
