'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Button, Badge } from '@/components/ds';
import { AdminNav } from '@/components/AdminNav';
import { Loader2, ShieldCheck } from 'lucide-react';

// Notifications viewer (DEVELOPER_HANDOFF.md §6-C). Reads the `notifications`
// table (migration 13, admin-only SELECT RLS). Delivery isn't wired up yet
// (§6-A) — every row here is QUEUED until that ships, which this page makes
// visible rather than hiding.

type NotifStatus = 'QUEUED' | 'SENT' | 'FAILED';

interface NotifRow {
  id: string;
  booking_id: string | null;
  recipient_role: string | null;
  event: string;
  title: string;
  body: string | null;
  status: NotifStatus;
  created_at: string;
}

const STATUS_TONE: Record<NotifStatus, 'teal' | 'success' | 'urgent'> = {
  QUEUED: 'teal', SENT: 'success', FAILED: 'urgent',
};

const FILTERS: { key: NotifStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'QUEUED', label: 'Queued' },
  { key: 'SENT', label: 'Sent' },
  { key: 'FAILED', label: 'Failed' },
];

export default function AdminNotifications() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [rows, setRows] = useState<NotifRow[]>([]);
  const [filter, setFilter] = useState<NotifStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'ALL') query = query.eq('status', filter);
    const { data } = await query;
    setRows((data as NotifRow[]) ?? []);
    setLoading(false);
  }, [isAdmin, filter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  if (isLoading) {
    return <main style={{ minHeight: '60vh', paddingTop: 118, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '138px 20px 48px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to view notifications.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/notifications')}>Sign in</Button>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '118px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Notifications</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Enqueued on every booking status change. Delivery isn't wired up yet (§6-A) — everything below stays QUEUED until it is.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700,
              border: `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
              background: active ? 'var(--teal)' : 'var(--surface)', color: active ? '#fff' : 'var(--ink-teal)',
            }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-lg)' }}>No notifications in this view.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((n) => (
            <div key={n.id} style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge tone={STATUS_TONE[n.status]} size="sm">{n.status.toLowerCase()}</Badge>
                  {n.recipient_role && <Badge tone="neutral" size="sm">{n.recipient_role.toLowerCase()}</Badge>}
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <strong style={{ display: 'block', color: 'var(--ink-teal)', fontSize: '0.92rem', lineHeight: 1.4 }}>{n.title}</strong>
              {n.body && <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
