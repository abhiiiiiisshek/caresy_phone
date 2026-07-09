'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Button, StatCard } from '@/components/ds';
import { AdminNav } from '@/components/AdminNav';
import { estimateBookingPrice } from '@/utils/pricing';
import { Loader2, ShieldCheck, ClipboardList, Users, CalendarClock, IndianRupee } from 'lucide-react';

// Admin analytics (DEVELOPER_HANDOFF.md §6-C). All counts come from queries
// admins already have RLS access to (bookings, companions) — no new RPC
// needed. Revenue is an estimate: prices aren't stored on bookings yet
// (payments aren't built — see §6-F), so it's derived via estimateBookingPrice().

const STATUS_ORDER = ['DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

interface Stats {
  byStatus: Record<string, number>;
  totalBookings: number;
  todayBookings: number;
  activeCompanions: number;
  onlineCompanions: number;
  estimatedRevenue: number;
}

export default function AdminAnalytics() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [bookingsRes, companionsRes] = await Promise.all([
      supabase.from('bookings').select('status, service_type, estimated_duration_minutes, created_at').is('deleted_at', null),
      supabase.from('companions').select('approval_status, is_online').is('deleted_at', null),
    ]);

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
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (isLoading) {
    return <main style={{ minHeight: '60vh', paddingTop: 118, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '138px 20px 48px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to view analytics.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/analytics')}>Sign in</Button>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '118px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Analytics</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>Snapshot of demand and supply. Revenue is an estimate — payments aren't wired up yet.</p>

      {loading || !stats ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <StatCard icon={<CalendarClock style={{ width: 20, height: 20 }} />} headline={stats.todayBookings} detail="Requests today" />
            <StatCard icon={<ClipboardList style={{ width: 20, height: 20 }} />} headline={stats.totalBookings} detail="Total requests" />
            <StatCard icon={<Users style={{ width: 20, height: 20 }} />} headline={`${stats.onlineCompanions} / ${stats.activeCompanions}`} detail="Companions online / approved" />
            <StatCard icon={<IndianRupee style={{ width: 20, height: 20 }} />} headline={`₹${stats.estimatedRevenue.toLocaleString('en-IN')}`} detail="Estimated revenue (completed jobs)" />
          </div>

          <h2 style={{ fontSize: '1.1rem', color: 'var(--ink-teal)', margin: '0 0 4px' }}>Requests by status</h2>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--muted)' }}>Click a row to open it in Dispatch.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {STATUS_ORDER.filter((s) => stats.byStatus[s]).map((s) => {
              const n = stats.byStatus[s];
              const pct = stats.totalBookings ? Math.round((n / stats.totalBookings) * 100) : 0;
              return (
                <Link key={s} href="/admin-ops" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                  <span style={{ width: 110, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{s.replace('_', ' ')}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--surface-2, rgba(0,0,0,0.06))', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--teal)' }} />
                  </div>
                  <span style={{ width: 40, textAlign: 'right', fontSize: '0.8rem', color: 'var(--muted)' }}>{n}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
