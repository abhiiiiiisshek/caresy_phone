'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@caresy/auth/supabase/client';
import { AdminShell, AdminGuard, Skels } from '@/components/AdminShell';
import { Inbox, Activity, Radio, Bell, ArrowRight } from 'lucide-react';

// Ops overview: at-a-glance counts pulled straight from the existing tables via
// cheap head+count queries (no rows fetched), each linking to the section that
// works it down. Replaces the old bare redirect to /ops.

const ACTIVE_TRIP = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_hospital', 'arrived'];

interface Counts { pending: number; active: number; trips: number; queued: number }

const CARDS: { key: keyof Counts; label: string; sub: string; href: string; Icon: React.ComponentType<{ style?: React.CSSProperties }>; tone: string }[] = [
  { key: 'pending', label: 'Pending requests', sub: 'Awaiting a companion', href: '/ops', Icon: Inbox, tone: '#c2410c' },
  { key: 'active', label: 'Active visits', sub: 'Accepted / in progress', href: '/ops', Icon: Activity, tone: 'var(--teal, #08796f)' },
  { key: 'trips', label: 'Live trips', sub: 'Companions en route', href: '/live', Icon: Radio, tone: 'var(--teal, #08796f)' },
  { key: 'queued', label: 'Queued notifications', sub: 'To send to customers', href: '/notifications', Icon: Bell, tone: '#7c3aed' },
];

export default function AdminOverview() {
  return (
    <AdminShell title="Overview" subtitle="Live snapshot of the desk. Tap a card to jump in." maxWidth={1000}>
      <AdminGuard purpose="view the ops overview">
        <OverviewBody />
      </AdminGuard>
    </AdminShell>
  );
}

function OverviewBody() {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const head = { count: 'exact' as const, head: true };
      const [p, a, t, q] = await Promise.all([
        supabase.from('bookings').select('id', head).in('status', ['DRAFT', 'PENDING']),
        supabase.from('bookings').select('id', head).in('status', ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS']),
        supabase.from('trips').select('id', head).in('status', ACTIVE_TRIP),
        supabase.from('notifications').select('id', head).eq('status', 'QUEUED'),
      ]);
      if (!alive) return;
      setCounts({ pending: p.count ?? 0, active: a.count ?? 0, trips: t.count ?? 0, queued: q.count ?? 0 });
    })();
    return () => { alive = false; };
  }, [supabase]);

  if (counts === null) return <Skels n={4} h={120} />;

  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {CARDS.map(({ key, label, sub, href, Icon, tone }) => (
        <Link key={key} href={href} className="adm-card" style={{ display: 'block', padding: 18, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--surface-2, #f2f4ef)', color: tone }}>
              <Icon style={{ width: 19, height: 19 }} />
            </span>
            <ArrowRight style={{ width: 16, height: 16, color: 'var(--muted)' }} />
          </div>
          <div style={{ marginTop: 14, fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--ink-teal)' }}>{counts[key]}</div>
          <div style={{ marginTop: 6, fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink-teal)' }}>{label}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{sub}</div>
        </Link>
      ))}
    </div>
  );
}
