'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Badge, Button } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels, relativeTime, useToast } from '@/components/AdminShell';
import { MessageCircle, Check, X } from 'lucide-react';

// Notifications outbox. Reads the `notifications` table (migration 13) and lets
// an admin drain the QUEUED rows: "Send on WhatsApp" opens click-to-chat with
// the customer's number pre-filled (no messaging API/keys — same pattern the
// rest of the app uses) and marks the row SENT; Mark sent / failed cover manual
// cases. Status writes need the admin UPDATE policy from migration 20.
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
  sent_at: string | null;
  booking?: { reference_code: string | null; service_metadata: { customerPhone?: string } | null } | null;
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
    <AdminShell title="Notifications" subtitle="Enqueued on every booking status change. Send each to the customer on WhatsApp, then it's marked done." maxWidth={780}>
      <AdminGuard purpose="view notifications">
        <NotifBody />
      </AdminGuard>
    </AdminShell>
  );
}

function NotifBody() {
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();
  const [all, setAll] = useState<NotifRow[] | null>(null);
  const [filter, setFilter] = useState<NotifStatus | 'ALL'>('ALL');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('notifications')
        .select('*, booking:bookings(reference_code, service_metadata)')
        .order('created_at', { ascending: false }).limit(FETCH_LIMIT);
      if (alive) setAll((data as unknown as NotifRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  // Optimistic status write; revert + toast on failure (e.g. migration 20 not run).
  const setStatus = useCallback(async (id: string, status: NotifStatus) => {
    const snapshot = all;
    const sent_at = status === 'SENT' ? new Date().toISOString() : null;
    setAll((cur) => (cur ?? []).map((n) => (n.id === id ? { ...n, status, sent_at } : n)));
    const { error } = await supabase.from('notifications').update({ status, sent_at }).eq('id', id);
    if (error) { setAll(snapshot); show(error.message, 'err'); }
  }, [all, supabase, show]);

  const sendWhatsApp = (n: NotifRow) => {
    const phone = (n.booking?.service_metadata?.customerPhone || '').replace(/\D/g, '');
    if (!phone) { show('No customer phone on this booking', 'err'); return; }
    const wa = phone.length === 10 ? `91${phone}` : phone; // default to +91 for bare 10-digit
    const text = `${n.title}${n.body ? `\n\n${n.body}` : ''}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    setStatus(n.id, 'SENT');
  };

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

              {n.status === 'QUEUED' ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm" onClick={() => sendWhatsApp(n)}
                    iconLeft={<MessageCircle style={{ width: 15, height: 15 }} />}>
                    Send on WhatsApp
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setStatus(n.id, 'SENT')} iconLeft={<Check style={{ width: 15, height: 15 }} />}>Mark sent</Button>
                  <Button variant="ghost" size="sm" onClick={() => setStatus(n.id, 'FAILED')} iconLeft={<X style={{ width: 15, height: 15 }} />}>Mark failed</Button>
                </div>
              ) : n.status === 'SENT' && n.sent_at ? (
                <p className="adm-side-note" style={{ marginTop: 10 }}>Sent {relativeTime(n.sent_at)}</p>
              ) : n.status === 'FAILED' ? (
                <div style={{ marginTop: 10 }}>
                  <Button variant="ghost" size="sm" onClick={() => sendWhatsApp(n)} iconLeft={<MessageCircle style={{ width: 15, height: 15 }} />}>Retry on WhatsApp</Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {toastNode}
    </>
  );
}
