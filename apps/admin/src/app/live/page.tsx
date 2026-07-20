'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { AdminShell, AdminGuard, Skels, relativeTime } from '@/components/AdminShell';
import { MapPin, RefreshCw, Radio } from 'lucide-react';

// Admin live view: active trips with last-known GPS position, status, and ETA.
// Trips are NOT on a realtime publication, so we POLL every 10s (an ops board is
// fine with near-real-time; broadcast wiring is companion→customer only).
// Map render uses a free OpenStreetMap embed (no SDK / API key / dependency);
// swap for a real map SDK if multi-trip overlay is needed later.
// ponytail: 10s poll + per-trip OSM iframe. Upgrade to a single Leaflet/Mapbox
// map with live markers when >handful of concurrent trips makes iframes heavy.

const POLL_MS = 10_000;

// Everything except the two terminal states counts as "live".
const ACTIVE_STATUSES = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_hospital', 'arrived'];

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assigned',
  en_route_pickup: 'En route to pickup',
  picked_up: 'Picked up',
  en_route_hospital: 'En route to hospital',
  arrived: 'Arrived',
};

const TRIP_SELECT = `
  id,
  status,
  last_lat,
  last_lng,
  last_location_at,
  eta_seconds,
  updated_at,
  booking:bookings!inner (
    reference_code,
    service_metadata,
    patient:patients ( full_name ),
    pickup_location:locations!pickup_location_id ( title )
  )
`;

interface TripRow {
  id: string;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  eta_seconds: number | null;
  updated_at: string;
  booking?: {
    reference_code: string | null;
    service_metadata: any;
    patient?: { full_name?: string } | null;
    pickup_location?: { title?: string } | null;
  } | null;
}

function fmtEta(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function AdminLive() {
  return (
    <AdminShell
      title="Live map"
      subtitle="Active companion trips with last-known location and ETA. Refreshes every 10 seconds."
      maxWidth={1240}
    >
      <AdminGuard purpose="view live trips">
        <LiveBoard />
      </AdminGuard>
    </AdminShell>
  );
}

function LiveBoard() {
  const supabase = useMemo(() => createClient(), []);
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .in('status', ACTIVE_STATUSES)
      .order('updated_at', { ascending: false });
    if (error) { setError(error.message); return; }
    setError(null);
    setTrips((data as unknown as TripRow[]) ?? []);
    setRefreshedAt(new Date().toISOString());
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) load(); };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [load]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--teal)', fontWeight: 600 }}>
          <Radio style={{ width: 15, height: 15 }} />
          {trips === null ? 'Loading…' : `${trips.length} active ${trips.length === 1 ? 'trip' : 'trips'}`}
        </span>
        {refreshedAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw style={{ width: 13, height: 13 }} />Updated {relativeTime(refreshedAt)}</span>}
      </div>

      {error && <div className="adm-toast err" style={{ position: 'static', marginBottom: 16 }}>{error}</div>}

      {trips === null ? (
        <Skels n={3} h={260} />
      ) : trips.length === 0 ? (
        <div className="adm-empty">No live trips right now. Active companion visits will appear here.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {trips.map((t) => <TripCard key={t.id} trip={t} />)}
        </div>
      )}
    </>
  );
}

function TripCard({ trip: t }: { trip: TripRow }) {
  const companion = t.booking?.service_metadata?.companion?.name || 'Unassigned companion';
  const patient = t.booking?.patient?.full_name || '—';
  const hospital = t.booking?.pickup_location?.title || '—';
  const eta = fmtEta(t.eta_seconds);
  const hasPos = t.last_lat != null && t.last_lng != null;

  return (
    <article style={{ padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink-teal)' }}>{companion}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Patient: {patient}{t.booking?.reference_code ? ` · ${t.booking.reference_code}` : ''}
          </div>
        </div>
        <span style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 999, background: 'var(--teal, #08796f)', color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}>
          {STATUS_LABEL[t.status] || t.status}
        </span>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
        <MapPin style={{ width: 13, height: 13 }} />{hospital}{eta ? ` · ETA ${eta}` : ''}
      </div>

      {hasPos ? (
        <>
          <div style={{ borderRadius: 'var(--radius-md, 12px)', overflow: 'hidden', border: '1px solid var(--line)', lineHeight: 0 }}>
            <iframe
              title={`Live location for ${t.booking?.reference_code || t.id}`}
              width="100%"
              height="180"
              loading="lazy"
              style={{ border: 0 }}
              src={osmEmbed(t.last_lat as number, t.last_lng as number)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.74rem', color: 'var(--muted)' }}>
            <span>Location {t.last_location_at ? relativeTime(t.last_location_at) : '—'}</span>
            <a href={`https://www.google.com/maps?q=${t.last_lat},${t.last_lng}`} target="_blank" rel="noopener" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
              Open in Maps
            </a>
          </div>
        </>
      ) : (
        <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-md, 12px)' }}>
          Awaiting first location ping
        </div>
      )}
    </article>
  );
}

// OpenStreetMap embed: a small bbox around the point + a marker. No key/dep.
function osmEmbed(lat: number, lng: number): string {
  const d = 0.008; // ~0.9km padding each side
  const bbox = [lng - d, lat - d, lng + d, lat + d].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}
