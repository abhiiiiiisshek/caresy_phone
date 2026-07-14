'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Badge } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels, relativeTime } from '@/components/AdminShell';

// Notifications viewer. Reads the `notifications` table (migration 13,
// admin-only SELECT RLS). Delivery isn't wired up yet — every row here is
// QUEUED until that ships, which this page makes visible rather than hiding.
// Loads the latest 300 once and filters client-side, so switching tabs is
// instant and each pill shows a live count.

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

const FETCH_LIMIT = 300;

export default function AdminNotifications() {
  return (
    <AdminShell title="Notifications" subtitle="Enqueued on every booking status change. Delivery isn't wired up yet — everything stays QUEUED until it is." maxWidth={780}>
      <AdminGuard purpose="view notifications">
        <NotifBody />
      </AdminGuard>
    </AdminShell>
  );
}

function NotifBody() {
  const supabase = useMemo(() => createClient(), []);
  const [all, setAll] = useState<NotifRow[] | null>(null);
  const [filter, setFilter] = useState<NotifStatus | 'ALL'>('ALL');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('notifications').select('*')
        .order('created_at', { ascending: false }).limit(FETCH_LIMIT);
      if (alive) setAll((data as NotifRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (all ?? []).forEach((n) => { c[n.status] = (c[n.status] || 0) + 1; });
    return c;
  }, [all]);

  const rows = useMemo(
    () => (all ?? []).filter((n) => filter === 'ALL' || n.status === filter),
    [all, filter],
  );

  return (
    <>
      <div className="adm-pills">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === 'ALL' ? (all?.length ?? 0) : counts[f.key] || 0;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`adm-pill${active ? ' is-active' : ''}`}>
              {f.label}{n > 0 && <span className="adm-pill-n">{n}</span>}
            </button>
          );
        })}
      </div>

      {all !== null && all.length === FETCH_LIMIT && (
        <p className="adm-hint" style={{ display: 'block', marginBottom: 12 }}>Showing the latest {FETCH_LIMIT}.</p>
      )}

      {all === null ? (
        <Skels n={5} h={86} />
      ) : rows.length === 0 ? (
        <div className="adm-empty">No notifications in this view.</div>
      ) : (
        <div className="adm-list" style={{ gap: 10 }}>
          {rows.map((n) => (
            <div key={n.id} className="adm-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge tone={STATUS_TONE[n.status]} size="sm">{n.status.toLowerCase()}</Badge>
                  {n.recipient_role && <Badge tone="neutral" size="sm">{n.recipient_role.toLowerCase()}</Badge>}
                </div>
                <span className="adm-side-note" title={new Date(n.created_at).toLocaleString('en-IN')}>
                  {relativeTime(n.created_at)}
                </span>
              </div>
              <strong style={{ display: 'block', color: 'var(--ink-teal)', fontSize: '0.92rem', lineHeight: 1.4 }}>{n.title}</strong>
              {n.body && <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
