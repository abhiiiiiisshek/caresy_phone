'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button } from '@caresy/ui';
import { Navigation, CheckCircle2, Loader2, XCircle } from 'lucide-react';

type TripStatus = 'assigned' | 'en_route_pickup' | 'picked_up' | 'en_route_hospital' | 'arrived' | 'completed' | 'cancelled';

const LABEL: Record<TripStatus, string> = {
  assigned: 'Assigned — ready to go',
  en_route_pickup: 'En route to pickup',
  picked_up: 'Picked up',
  en_route_hospital: 'En route to hospital',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const NEXT: Record<string, TripStatus | null> = {
  assigned: 'en_route_pickup',
  en_route_pickup: 'picked_up',
  picked_up: 'en_route_hospital',
  en_route_hospital: 'arrived',
  arrived: 'completed',
};

function nextLabel(next: TripStatus): string {
  const m: Record<TripStatus, string> = {
    assigned: 'Assigned',
    en_route_pickup: 'Start pickup run',
    picked_up: 'Confirm pickup',
    en_route_hospital: 'Head to hospital',
    arrived: 'Mark arrived',
    completed: 'Complete trip',
    cancelled: 'Cancel trip',
  };
  return m[next] || next;
}

export default function TripStatusControl({ bookingId }: { bookingId: string }) {
  const [trip, setTrip] = useState<{ id: string; status: TripStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('trips').select('id, status').eq('booking_id', bookingId).maybeSingle();
    if (error) setError(error.message);
    else setTrip((data as { id: string; status: TripStatus } | null) ?? null);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('trips').select('id, status').eq('booking_id', bookingId).maybeSingle();
      if (!alive) return;
      if (error) setError(error.message);
      else setTrip((data as { id: string; status: TripStatus } | null) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [bookingId]);

  // Auto-create trip if missing but booking is already accepted/in_progress — use RPC
  const ensureTrip = async () => {
    setError(null);
    setAdvancing(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('start_trip_for_booking', { p_booking: bookingId });
    setAdvancing(false);
    if (error) { setError(error.message); return; }
    await fetchTrip();
  };

  const advance = async (next: TripStatus) => {
    if (!trip) return;
    setError(null);
    setAdvancing(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('advance_trip_status', { p_trip: trip.id, p_next: next });
    setAdvancing(false);
    if (error) { setError(error.message); return; }
    await fetchTrip();
  };

  if (loading) return <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Loading trip…</div>;
  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flex: 1 }}>No trip yet — start the job to create it.</span>
        <Button size="sm" variant="outline" disabled={advancing} onClick={ensureTrip} iconLeft={advancing ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Navigation style={{ width: 14, height: 14 }} />}>
          {advancing ? 'Creating…' : 'Create trip'}
        </Button>
      </div>
    );
  }

  const next = NEXT[trip.status];
  const isTerminal = trip.status === 'completed' || trip.status === 'cancelled';

  return (
    <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-teal)' }}>
          Trip: <span style={{ color: 'var(--teal)' }}>{LABEL[trip.status] ?? trip.status}</span>
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{trip.id.slice(0, 8)}</span>
      </div>
      {!isTerminal && next && (
        <Button size="sm" variant="primary" disabled={advancing} onClick={() => advance(next)} iconLeft={advancing ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}>
          {nextLabel(next)}
        </Button>
      )}
      {!isTerminal && (
        <Button size="sm" variant="ghost" disabled={advancing} onClick={() => advance('cancelled')} iconLeft={<XCircle style={{ width: 14, height: 14 }} />}>
          Cancel trip
        </Button>
      )}
      {isTerminal && <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Trip {trip.status} — no further moves.</span>}
      {error && <span style={{ fontSize: '0.72rem', color: 'var(--danger, #b3261e)' }}>{error}</span>}
      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Each step notifies the family via <code>TRIP_{trip.status.toUpperCase()}</code> (CARESY-3b).</span>
    </div>
  );
}
