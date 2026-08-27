'use client';

import type { BookingStatus } from '@caresy/types';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@caresy/auth/supabase/client';
import { AdminShell, AdminGuard } from '@/components/AdminShell';
import { bookingRevenueRupees, isBilled } from '@/utils/pricing';
import { ClipboardList, Users, CalendarClock, IndianRupee } from 'lucide-react';

// Admin analytics. All counts come from queries admins already have RLS access
// to (bookings, companions) — no new RPC needed. Revenue now uses the real
// final_amount_paise where billing wrote one and only projects the rest, so the
// tile says how many rows are still projections instead of quietly mixing them.
// Per-booking money detail lives on /payments.

const STATUS_ORDER: BookingStatus[] = ['DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const MUTED_STATUSES = new Set<BookingStatus>(['CANCELLED', 'EXPIRED']);

interface Stats {
  byStatus: Record<BookingStatus, number>;
  totalBookings: number;
  todayBookings: number;
  activeCompanions: number;
  onlineCompanions: number;
  revenue: number;
  projectedCount: number;
}

// What rides between these areas have actually cost — the payoff of every fare
// the companions logged (migration 27). Nothing rendered it, so the data sat in
// a view nobody could read without opening the SQL editor. This is what tells
// ops whether "about ₹300 to Kailash" is true before quoting it to a customer.
interface FareRow {
  provider: string;
  drop_label: string;
  ride_hour: number;
  rides: number;
  avg_fare_paise: number;
  min_fare_paise: number;
  max_fare_paise: number;
}

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

export default function AdminAnalytics() {
  return (
    <AdminShell title="Analytics" subtitle="Snapshot of demand and supply. Revenue uses the billed amount where there is one. Payment detail lives under Payments." maxWidth={900}>
      <AdminGuard purpose="view analytics">
        <AnalyticsBody />
      </AdminGuard>
    </AdminShell>
  );
}

function AnalyticsBody() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fares, setFares] = useState<FareRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [bookingsRes, companionsRes, faresRes] = await Promise.all([
        supabase.from('bookings').select('status, service_type, estimated_duration_minutes, final_amount_paise, created_at').is('deleted_at', null),
        supabase.from('companions').select('approval_status, is_online').is('deleted_at', null),
        supabase.from('transport_fare_reference').select('*').order('rides', { ascending: false }).limit(20),
      ]);
      if (!alive) return;

      const bookings = bookingsRes.data ?? [];
      const companions = companionsRes.data ?? [];
      setFares((faresRes.data ?? []) as FareRow[]);

      const byStatus: Record<string, number> = {};
      let todayBookings = 0;
      let revenue = 0;
      let projectedCount = 0;
      for (const b of bookings) {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        if (new Date(b.created_at) >= startOfToday) todayBookings += 1;
        if (b.status === 'COMPLETED') {
          revenue += bookingRevenueRupees(b);
          if (!isBilled(b)) projectedCount += 1;
        }
      }

      const activeCompanions = companions.filter((c) => c.approval_status === 'APPROVED').length;
      const onlineCompanions = companions.filter((c) => c.approval_status === 'APPROVED' && c.is_online).length;

      setStats({ byStatus, totalBookings: bookings.length, todayBookings, activeCompanions, onlineCompanions, revenue, projectedCount });
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
    {
      Icon: IndianRupee,
      n: `₹${stats.revenue.toLocaleString('en-IN')}`,
      label: stats.projectedCount > 0
        ? `Revenue, completed (${stats.projectedCount} projected)`
        : 'Revenue, completed (billed)',
    },
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

      {fares.length > 0 && (
        <>
          <h2 className="adm-sec">Ride fares actually paid</h2>
          <p className="adm-hint" style={{ display: 'block', marginBottom: 12 }}>
            From the fares companions logged. Never billed to the customer — reference only.
          </p>
          <div className="adm-list" style={{ gap: 8, overflowX: 'auto' }}>
            {fares.map((f) => (
              <div key={`${f.provider}-${f.drop_label}-${f.ride_hour}`} className="adm-bar-row" style={{ cursor: 'default' }}>
                <span className="adm-bar-label" style={{ flex: 1 }}>
                  {f.drop_label} · {f.provider} · {hourLabel(f.ride_hour)}
                </span>
                <span className="adm-hint">
                  {rupees(f.min_fare_paise)}–{rupees(f.max_fare_paise)} over {f.rides} {f.rides === 1 ? 'ride' : 'rides'}
                </span>
                <span className="adm-bar-n">{rupees(f.avg_fare_paise)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
