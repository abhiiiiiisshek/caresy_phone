'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button } from '@caresy/ui';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';

// Live location sharing for the assigned companion. Watches the device GPS and
// writes trips.last_lat/last_lng for this booking's trip, which the customer's
// tracking page and the admin live map read. RLS ("Only assigned companion
// updates trip", migration 16) restricts writes to the assigned companion.
// ponytail: 12s write throttle, no distance filter — plenty for a "where's my
// companion" map. Add a movement threshold only if write volume matters.

const MIN_WRITE_MS = 12_000;

export default function LocationShare({ bookingId }: { bookingId: string }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const tripId = useRef<string | null>(null);
  const lastWrite = useRef(0);

  const stop = useCallback(() => {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    setSharing(false);
  }, []);

  // Clean up the watch if the card unmounts while still sharing.
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

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
    if (!data) { setError('No active trip for this booking yet'); return; }
    tripId.current = data.id;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastWrite.current < MIN_WRITE_MS) return; // throttle DB writes
        lastWrite.current = now;
        const { error: ue } = await supabase.from('trips')
          .update({ last_lat: pos.coords.latitude, last_lng: pos.coords.longitude, last_location_at: new Date(now).toISOString() })
          .eq('id', tripId.current!);
        if (ue) setError(ue.message); else { setError(null); setSentAt(now); }
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
