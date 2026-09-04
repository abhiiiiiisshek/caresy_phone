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

const MIN_WRITE_MS = 12_000;

export default function LocationShare({ bookingId }: { bookingId: string }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const tripId = useRef<string | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastWrite = useRef(0);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    try { if (channel.current) { const supabase = createClient(); supabase.removeChannel(channel.current); } } catch {}
    channel.current = null;
    setSharing(false);
  }, []);

  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); try { if (channel.current) createClient().removeChannel(channel.current); } catch {} }, []);

  const start = async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Location isn’t available on this device'); return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error: e } = await supabase.from('trips').select('id')
      .eq('booking_id', bookingId).not('status', 'in', '(completed,cancelled)')
      .limit(1).maybeSingle();
    setBusy(false);
    if (e) { setError(e.message); return; }
    if (!data) { setError('No active trip for this booking yet — start the job first'); return; }
    tripId.current = (data as { id: string }).id;

    // Subscribe before sending — required by Realtime, and it is the subscribe
    // that the WITH CHECK policy is evaluated against.
    try {
      const ch = supabase.channel(`trip:${tripId.current}`, { config: { private: true } });
      ch.subscribe();
      channel.current = ch;
    } catch {}

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
      (err) => { setError(err.message); stop(); },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    setSharing(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <Button
        variant={sharing ? 'outline' : 'primary'}
        size="sm"
        disabled={busy}
        onClick={sharing ? stop : start}
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
      ) : null}
    </div>
  );
}
