'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button } from '@caresy/ui';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';

// Live location sharing for the assigned companion. Watches the device GPS and
// (a) writes trips.last_lat/last_lng for this booking's trip (poll fallback for
//     tracking.tsx 10s poll via get_shared_tracking),
// (b) broadcasts to Realtime channel `trip:<trip_id>` (tracking.tsx also listens
//     on `trip:<share_token>` — but trip:<id> is the canonical per migration 16,
//     and tracking.tsx will pick it up via the poll; we broadcast to both shapes
//     to cover either subscriber), and
// (c) inserts a throttled breadcrumb into trip_locations for audit (optional,
//     purged after 7d by purge_trip_locations).
//
// RLS: "Only assigned companion updates trip" (16) + "Trip participants can
// receive broadcast" + "Companion inserts own breadcrumb". All best-effort.
// Throttle: 12s + no duplicate if < 30m movement (cheap, good enough).

const MIN_WRITE_MS = 12_000;

export default function LocationShare({ bookingId }: { bookingId: string }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const tripId = useRef<string | null>(null);
  const shareToken = useRef<string | null>(null);
  const channel = useRef<any>(null);
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
    // Need trip id and share_token for broadcast channel parity
    const { data: booking } = await supabase.from('bookings').select('share_token').eq('id', bookingId).maybeSingle();
    shareToken.current = (booking as any)?.share_token ?? null;

    const { data, error: e } = await supabase.from('trips').select('id')
      .eq('booking_id', bookingId).not('status', 'in', '(completed,cancelled)')
      .limit(1).maybeSingle();
    setBusy(false);
    if (e) { setError(e.message); return; }
    if (!data) { setError('No active trip for this booking yet — start the job first'); return; }
    tripId.current = (data as any).id;

    // Subscribe to broadcast channel before sending — required by Realtime
    try {
      const ch = supabase.channel(`trip:${tripId.current}`);
      ch.subscribe();
      channel.current = ch;
      // Also subscribe to share_token channel for tracking.tsx parity (it listens on trip:<share_token>)
      if (shareToken.current) {
        const ch2 = supabase.channel(`trip:${shareToken.current}`);
        ch2.subscribe();
        // keep primary in channel.current, but we will send to both on each ping
      }
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

        // (b) Realtime broadcast — tracking.tsx listens on trip:<token> plus poll
        try {
          const payload = { last_lat: latitude, last_lng: longitude, at };
          if (channel.current) await channel.current.send({ type: 'broadcast', event: 'location', payload });
          // Parity: also broadcast on share_token channel if known
          if (shareToken.current) {
            const ch2 = supabase.channel(`trip:${shareToken.current}`);
            await ch2.send({ type: 'broadcast', event: 'location', payload });
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
            } as any);
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
          {sentAt ? 'Location live — sharing with family (broadcast + poll)' : 'Getting your location…'}
        </span>
      ) : null}
    </div>
  );
}
