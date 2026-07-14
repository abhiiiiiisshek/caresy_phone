'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@caresy/auth/supabase/client';
import { AdminShell, AdminGuard } from '@/components/AdminShell';
import { estimateBookingPrice } from '@/utils/pricing';
import { ClipboardList, Users, CalendarClock, IndianRupee } from 'lucide-react';

// Admin analytics. All counts come from queries admins already have RLS access
// to (bookings, companions) — no new RPC needed. Revenue is an estimate: prices
// aren't stored on bookings yet (payments aren't built), so it's derived via
// estimateBookingPrice().

const STATUS_ORDER = ['DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const MUTED_STATUSES = new Set(['CANCELLED', 'EXPIRED']);

interface Stats {
  byStatus: Record<string, number>;
  totalBookings: number;
  todayBookings: number;
  activeCompanions: number;
  onlineCompanions: number;
  estimatedRevenue: number;
}

export default function AdminAnalytics() {
  return (
    <AdminShell title="Analytics" subtitle="Snapshot of demand and supply. Revenue is an estimate — payments aren't wired up yet." maxWidth={900}>
      <AdminGuard purpose="view analytics">
        <AnalyticsBody />
      </AdminGuard>
    </AdminShell>
  );
}

function AnalyticsBody() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [bookingsRes, companionsRes] = await Promise.all([
        supabase.from('bookings').select('status, service_type, estimated_duration_minutes, created_at').is('deleted_at', null),
        supabase.from('companions').select('approval_status, is_online').is('deleted_at', null),
      ]);
      if (!alive) return;

      const bookings = bookingsRes.data ?? [];
      const companions = companionsRes.data ?? [];

      const byStatus: Record<string, number> = {};
      let todayBookings = 0;
      let estimatedRevenue = 0;
      for (const b of bookings) {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        if (new Date(b.created_at) >= startOfToday) todayBookings += 1;
        if (b.status === 'COMPLETED') estimatedRevenue += estimateBookingPrice(b);
      }

      const activeCompanions = companions.filter((c) => c.approval_status === 'APPROVED').length;
      const onlineCompanions = companions.filter((c) => c.approval_status === 'APPROVED' && c.is_online).length;

      setStats({ byStatus, totalBookings: bookings.length, todayBookings, activeCompanions, onlineCompanions, estimatedRevenue });
    })();
    return () => { alive = false; };
  }, [supabase]);

  if (!stats) {
    return (
      <>
        <div className="adm-stats">
          {[0, 1, 2, 3].map((i) => <div key={i} className="adm-skel" style={{ height: 128 }} />)}
        </div>
        <div className="adm-list">
          {[0, 1, 2].map((i) => <div key={i} className="adm-skel" style={{ height: 44 }} />)}
        </div>
      </>
    );
  }

  const tiles = [
    { Icon: CalendarClock, n: String(stats.todayBookings), label: 'Requests today' },
    { Icon: ClipboardList, n: String(stats.totalBookings), label: 'Total requests' },
    { Icon: Users, n: `${stats.onlineCompanions} / ${stats.activeCompanions}`, label: 'Companions online / approved' },
    { Icon: IndianRupee, n: `₹${stats.estimatedRevenue.toLocaleString('en-IN')}`, label: 'Estimated revenue (completed)' },
  ];

  const visibleStatuses = STATUS_ORDER.filter((s) => stats.byStatus[s]);

  return (
    <>
      <div className="adm-stats">
        {tiles.map(({ Icon, n, label }) => (
          <div key={label} className="adm-stat">
            <span className="adm-stat-ico"><Icon style={{ width: 19, height: 19 }} /></span>
            <span className="adm-stat-n">{n}</span>
            <span className="adm-stat-l">{label}</span>
          </div>
        ))}
      </div>

      <h2 className="adm-sec">Requests by status</h2>
      <p className="adm-hint" style={{ display: 'block', marginBottom: 12 }}>Click a row to open it in Dispatch.</p>
      <div className="adm-list" style={{ gap: 8 }}>
        {visibleStatuses.length === 0 ? (
          <div className="adm-empty">No requests yet.</div>
        ) : visibleStatuses.map((s) => {
          const n = stats.byStatus[s];
          const pct = stats.totalBookings ? Math.round((n / stats.totalBookings) * 100) : 0;
          return (
            <Link key={s} href="/ops" className="adm-bar-row">
              <span className="adm-bar-label">{s.replace('_', ' ')}</span>
              <div className="adm-bar">
                <div className={`adm-bar-fill${MUTED_STATUSES.has(s) ? ' tone-muted' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="adm-bar-n">{n}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
