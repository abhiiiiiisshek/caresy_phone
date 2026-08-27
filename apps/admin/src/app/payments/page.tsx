'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Badge, Button } from '@caresy/ui';
import type { BadgeTone } from '@caresy/ui';
import { formatINR } from '@caresy/utils/pricing';
import { AdminShell, AdminGuard, Skels, useToast, relativeTime } from '@/components/AdminShell';
import { IndianRupee, Clock, CheckCircle2, Banknote, Smartphone, Ban, Loader2 } from 'lucide-react';

// Money ledger. Until this page existed, "who still owes us" was only answerable
// by hand-written SQL — nothing in the panel read final_amount_paise at all.
//
// Read-mostly on purpose: the amount is set by complete_booking() and the
// collection by record_payment(), both companion-side (26_BILLING.sql). The one
// write here is mark-as-waived, which is the correction ops actually needs — a
// visit that should not be charged. It goes through a plain UPDATE because the
// guard trigger exempts is_admin(); that exemption is the documented escape
// hatch for correcting a bill by hand.
//
// UNBILLED bookings are excluded: they have no amount yet, so they are dispatch
// work, not payment work.

const SELECT = `
  id,
  reference_code,
  payment_status,
  payment_method,
  final_amount_paise,
  billed_minutes,
  collected_at,
  actual_end_time,
  patient:patients ( full_name )
`;

type PaymentStatus = 'PENDING' | 'COLLECTED' | 'WAIVED';

interface PaymentRow {
  id: string;
  reference_code: string;
  payment_status: PaymentStatus;
  payment_method: 'CASH' | 'UPI' | null;
  final_amount_paise: number | null;
  billed_minutes: number | null;
  collected_at: string | null;
  actual_end_time: string | null;
  patient?: { full_name: string | null } | null;
}

const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'COLLECTED', label: 'Collected' },
  { key: 'WAIVED', label: 'Waived' },
  { key: 'ALL', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: 'urgent',
  COLLECTED: 'success',
  WAIVED: 'neutral',
};

/** Local midnight, so "today" means the operator's day, not UTC's. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function AdminPayments() {
  return (
    <AdminShell
      title="Payments"
      subtitle="What has been billed, what is still owed, and what was collected in cash or UPI."
      maxWidth={900}
    >
      <AdminGuard purpose="view payments">
        <PaymentsLedger />
      </AdminGuard>
    </AdminShell>
  );
}

function PaymentsLedger() {
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();

  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('bookings')
        .select(SELECT)
        .neq('payment_status', 'UNBILLED')
        .is('deleted_at', null)
        .order('actual_end_time', { ascending: false, nullsFirst: false });
      if (!alive) return;
      if (err) setError(err.message);
      setRows((data as unknown as PaymentRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const totals = useMemo(() => {
    const today = startOfToday();
    const list = rows ?? [];
    const sum = (rs: PaymentRow[]) => rs.reduce((n, r) => n + (r.final_amount_paise ?? 0), 0);
    const pending = list.filter((r) => r.payment_status === 'PENDING');
    const collected = list.filter((r) => r.payment_status === 'COLLECTED');
    return {
      pendingPaise: sum(pending),
      pendingCount: pending.length,
      todayPaise: sum(collected.filter((r) => r.collected_at && new Date(r.collected_at).getTime() >= today)),
      collectedPaise: sum(collected),
    };
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.payment_status] = (c[r.payment_status] || 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? (rows ?? []) : (rows ?? []).filter((r) => r.payment_status === filter)),
    [rows, filter],
  );

  // Optimistic, like the dispatch board: the row restyles immediately, the write
  // runs behind it, and a failure puts the old list back so nothing silently
  // reads as waived when the DB refused.
  const waive = useCallback(async (id: string) => {
    const snapshot = rows;
    setConfirmId(null);
    setSavingId(id);
    setRows((cur) => (cur ?? []).map((r) => (r.id === id ? { ...r, payment_status: 'WAIVED' } : r)));

    const { data, error: err } = await supabase
      .from('bookings')
      .update({ payment_status: 'WAIVED' })
      .eq('id', id)
      .eq('payment_status', 'PENDING')
      .select('id');
    setSavingId(null);

    if (err) {
      setRows(snapshot);
      show(err.message, 'err');
    } else if (!data || data.length === 0) {
      setRows(snapshot);
      show('This payment was already collected or waived — refresh to see current status.', 'err');
    } else {
      show('Marked waived');
    }
  }, [rows, supabase, show]);

  const tiles = [
    { Icon: Clock, n: formatINR(totals.pendingPaise), label: `Owed now (${totals.pendingCount} unpaid)` },
    { Icon: CheckCircle2, n: formatINR(totals.todayPaise), label: 'Collected today' },
    { Icon: IndianRupee, n: formatINR(totals.collectedPaise), label: 'Collected all time' },
  ];

  return (
    <>
      {rows === null ? (
        <div className="adm-stats">
          {[0, 1, 2].map((i) => <div key={i} className="adm-skel" style={{ height: 128 }} />)}
        </div>
      ) : (
        <div className="adm-stats">
          {tiles.map(({ Icon, n, label }) => (
            <div key={label} className="adm-stat">
              <span className="adm-stat-ico"><Icon style={{ width: 19, height: 19 }} /></span>
              <span className="adm-stat-n">{n}</span>
              <span className="adm-stat-l">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="adm-pills">
        {FILTERS.map((f) => {
          const n = f.key === 'ALL' ? (rows?.length ?? 0) : counts[f.key] || 0;
          return (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`adm-pill${filter === f.key ? ' is-active' : ''}`}>
              {f.label}{n > 0 && <span className="adm-pill-n">{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="adm-error">{error}</p>}

      {rows === null ? (
        <Skels n={4} h={72} />
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          {filter === 'PENDING'
            ? 'Nothing outstanding — every completed visit has been settled.'
            : 'No bookings in this state yet.'}
        </div>
      ) : (
        <div className="adm-list">
          {filtered.map((r) => (
            <LedgerRow key={r.id} row={r}
              confirming={confirmId === r.id}
              saving={savingId === r.id}
              onAskWaive={() => setConfirmId(r.id)}
              onCancelWaive={() => setConfirmId(null)}
              onWaive={() => waive(r.id)} />
          ))}
        </div>
      )}

      {toastNode}
    </>
  );
}

function LedgerRow({
  row: r, confirming, saving, onAskWaive, onCancelWaive, onWaive,
}: {
  row: PaymentRow;
  confirming: boolean;
  saving: boolean;
  onAskWaive: () => void;
  onCancelWaive: () => void;
  onWaive: () => void;
}) {
  const MethodIcon = r.payment_method === 'UPI' ? Smartphone : Banknote;

  return (
    <div className="adm-card adm-row">
      <div className="adm-row-main">
        <div className="adm-name-row">
          <strong>{r.patient?.full_name || 'Unnamed patient'}</strong>
          <Badge tone={STATUS_TONE[r.payment_status]} size="sm">{r.payment_status.toLowerCase()}</Badge>
          {r.payment_method && (
            <Badge tone="neutral" size="sm">{r.payment_method.toLowerCase()}</Badge>
          )}
        </div>
        <div className="adm-meta">
          <span>{r.reference_code}</span>
          {r.billed_minutes != null && <span>{r.billed_minutes} min billed</span>}
          {r.payment_status === 'COLLECTED' && r.collected_at
            ? <span><MethodIcon />collected {relativeTime(r.collected_at)}</span>
            : r.actual_end_time && <span>finished {relativeTime(r.actual_end_time)}</span>}
        </div>
      </div>

      <strong style={{ fontSize: '1.05rem', color: 'var(--ink-teal)', fontVariantNumeric: 'tabular-nums' }}>
        {r.final_amount_paise != null ? formatINR(r.final_amount_paise) : '—'}
      </strong>

      {r.payment_status === 'PENDING' && (
        confirming ? (
          <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Button variant="primary" size="sm" onClick={onWaive}>Confirm</Button>
            <Button variant="outline" size="sm" onClick={onCancelWaive}>Cancel</Button>
          </span>
        ) : (
          <Button variant="outline" size="sm" disabled={saving} onClick={onAskWaive}
            iconLeft={saving
              ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
              : <Ban style={{ width: 14, height: 14 }} />}>
            {saving ? 'Saving…' : 'Waive'}
          </Button>
        )
      )}
    </div>
  );
}
