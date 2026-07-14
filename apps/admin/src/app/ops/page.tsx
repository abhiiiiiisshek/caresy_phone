'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Input } from '@caresy/ui';
import { AdminShell, AdminGuard, useToast } from '@/components/AdminShell';
import { Inbox, Activity, CheckCircle2, Loader2 } from 'lucide-react';

// Dispatch board. Loads every booking (with patient + pickup joins), approved
// companions for assignment, and the editable "Live Operations Desk" numbers.
// Saves are OPTIMISTIC: the card moves/updates instantly, the DB write runs in
// the background and reverts on error — no full-board refetch per save.

const STATUS_OPTIONS = [
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

const BOOKING_SELECT = `
  id,
  reference_code,
  status,
  created_at,
  scheduled_start_time,
  special_instructions,
  estimated_duration_minutes,
  service_type,
  booking_type,
  service_metadata,
  companion_user_id,
  patient:patients (
    full_name,
    age,
    emergency_contact_phone
  ),
  pickup_location:locations!pickup_location_id (
    title,
    address_line_1
  )
`;

interface BookingRecord {
  id: string;
  reference_code: string;
  status: string;
  created_at: string;
  scheduled_start_time: string | null;
  special_instructions: string | null;
  service_type: string;
  booking_type: string;
  service_metadata: any;
  companion_user_id: string | null;
  patient?: any;
  pickup_location?: any;
}

interface ApprovedCompanion {
  id: string;
  full_name: string;
  specialties: string[] | null;
  languages: string[] | null;
  photo_url: string | null;
  rating: number | null;
  total_jobs: number;
}

interface OpsMetrics { active_companions: number; avg_callback_minutes: number }

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Every booking status appears in exactly one column (the old board dropped
// ACCEPTED and EXPIRED rows entirely, so accepted jobs vanished from dispatch).
const COLUMNS = [
  { key: 'pend', klass: 'pend', title: 'Pending requests', Icon: Inbox, statuses: ['DRAFT', 'PENDING'] },
  { key: 'act', klass: 'act', title: 'Active visits', Icon: Activity, statuses: ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
  { key: 'done', klass: 'done', title: 'Completed', Icon: CheckCircle2, statuses: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
] as const;

export default function AdminOps() {
  return (
    <AdminShell
      title="Dispatch"
      subtitle="Monitor incoming requests, assign companions, and push milestone updates to families."
      maxWidth={1240}
    >
      <AdminGuard purpose="run the dispatch board">
        <OpsBoard />
      </AdminGuard>
    </AdminShell>
  );
}

function OpsBoard() {
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();

  const [bookings, setBookings] = useState<BookingRecord[] | null>(null);
  const [companions, setCompanions] = useState<ApprovedCompanion[]>([]);
  const [edits, setEdits] = useState<Record<string, { companionId: string; status: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [savingMetrics, setSavingMetrics] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [bRes, cRes, mRes] = await Promise.all([
        supabase.from('bookings').select(BOOKING_SELECT).order('created_at', { ascending: false }),
        supabase.from('companions')
          .select('id, full_name, specialties, languages, photo_url, rating, total_jobs')
          .eq('approval_status', 'APPROVED').is('deleted_at', null).order('full_name'),
        supabase.from('ops_metrics').select('active_companions, avg_callback_minutes').eq('id', 1).single(),
      ]);
      if (!alive) return;
      const list = (bRes.data as unknown as BookingRecord[]) ?? [];
      setBookings(list);
      setEdits(Object.fromEntries(list.map((b) => [b.id, { companionId: b.companion_user_id || '', status: b.status }])));
      setCompanions((cRes.data as ApprovedCompanion[]) ?? []);
      if (!mRes.error && mRes.data) setMetrics(mRes.data as OpsMetrics);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const saveMetrics = async () => {
    if (!metrics) return;
    setSavingMetrics(true);
    const { error } = await supabase.from('ops_metrics').update({
      active_companions: metrics.active_companions,
      avg_callback_minutes: metrics.avg_callback_minutes,
    }).eq('id', 1);
    setSavingMetrics(false);
    show(error ? error.message : 'Live desk numbers updated', error ? 'err' : 'ok');
  };

  // Optimistic save: the card updates (and moves columns) immediately; the DB
  // write runs in the background; on failure we restore the snapshot and keep
  // the operator's selections so they can retry.
  const save = useCallback(async (bookingId: string) => {
    const edit = edits[bookingId];
    const booking = (bookings ?? []).find((b) => b.id === bookingId);
    if (!edit || !booking) return;

    const matched = companions.find((c) => c.id === edit.companionId) || null;
    // Stored in the shape my-bookings/page.tsx expects to render.
    const matchedCompanion = matched ? {
      name: matched.full_name,
      avatar: initials(matched.full_name),
      photo: matched.photo_url || undefined,
      rating: matched.rating != null ? `${matched.rating.toFixed(1)} (${matched.total_jobs} visits)` : 'New companion',
      verification: 'Police Verified',
      lang: (matched.languages || []).join(', ') || 'Hindi, English',
      specialty: (matched.specialties || [])[0] || 'General Care',
      color: '#08796f',
    } : null;

    const updatedMetadata = { ...(booking.service_metadata || {}), companion: matchedCompanion };
    const snapshot = bookings;

    setBookings((cur) => (cur ?? []).map((b) => b.id === bookingId
      ? { ...b, status: edit.status, companion_user_id: edit.companionId || null, service_metadata: updatedMetadata }
      : b));
    setSavingId(bookingId);
    show(`Updated ${booking.reference_code}`);

    const { error } = await supabase.from('bookings').update({
      status: edit.status,
      companion_user_id: edit.companionId || null,
      service_metadata: updatedMetadata,
    }).eq('id', bookingId);
    setSavingId(null);

    if (error) {
      setBookings(snapshot);
      show(error.message, 'err');
    }
  }, [edits, bookings, companions, supabase, show]);

  const setEdit = (id: string, patch: Partial<{ companionId: string; status: string }>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const columns = useMemo(() => COLUMNS.map((col) => {
    let rows = (bookings ?? []).filter((b) => (col.statuses as readonly string[]).includes(b.status));
    if (col.key === 'act') {
      // Soonest visit first (instant jobs — no scheduled time — sort by creation).
      rows = [...rows].sort((a, b) =>
        new Date(a.scheduled_start_time ?? a.created_at).getTime() -
        new Date(b.scheduled_start_time ?? b.created_at).getTime());
    }
    return { ...col, rows };
  }), [bookings]);

  return (
    <>
      {metrics && (
        <section className="adm-card adm-metrics">
          <div className="adm-metrics-txt">
            <span className="adm-live-chip"><span className="dot" />Live desk numbers</span>
            <p>Shown on the Booking, Quick Help, and Trust pages. Keep these accurate.</p>
          </div>
          <div className="adm-metric-input">
            <Input label="Companions online" type="number" min={0} value={metrics.active_companions}
              onChange={(e) => setMetrics({ ...metrics, active_companions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="adm-metric-input">
            <Input label="Avg callback (mins)" type="number" min={0} value={metrics.avg_callback_minutes}
              onChange={(e) => setMetrics({ ...metrics, avg_callback_minutes: parseInt(e.target.value) || 0 })} />
          </div>
          <Button variant="primary" size="sm" disabled={savingMetrics} onClick={saveMetrics}
            iconLeft={savingMetrics ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : undefined}>
            {savingMetrics ? 'Saving…' : 'Save'}
          </Button>
        </section>
      )}

      <div className="adm-board">
        {columns.map(({ key, klass, title, Icon, rows }) => (
          <section key={key} className={`adm-col ${klass}`}>
            <div className="adm-col-head">
              <span className="adm-col-ico"><Icon style={{ width: 17, height: 17 }} /></span>
              <span className="adm-col-title">{title}</span>
              <span className="adm-col-n">{bookings === null ? '…' : rows.length}</span>
            </div>
            <div className="adm-col-body">
              {bookings === null ? (
                <>
                  <div className="adm-skel" style={{ height: 220 }} />
                  <div className="adm-skel" style={{ height: 220 }} />
                </>
              ) : rows.length === 0 ? (
                <div className="adm-empty">Nothing here right now.</div>
              ) : rows.map((b) => (
                <JobCard key={b.id} booking={b} companions={companions}
                  edit={edits[b.id] ?? { companionId: b.companion_user_id || '', status: b.status }}
                  saving={savingId === b.id}
                  onEdit={(patch) => setEdit(b.id, patch)}
                  onSave={() => save(b.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {toastNode}
    </>
  );
}

function JobCard({
  booking: b, companions, edit, saving, onEdit, onSave,
}: {
  booking: BookingRecord;
  companions: ApprovedCompanion[];
  edit: { companionId: string; status: string };
  saving: boolean;
  onEdit: (patch: Partial<{ companionId: string; status: string }>) => void;
  onSave: () => void;
}) {
  const meta = b.service_metadata || {};
  const when = b.scheduled_start_time
    ? new Date(b.scheduled_start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'INSTANT';
  const dirty = edit.status !== b.status || edit.companionId !== (b.companion_user_id || '');

  return (
    <article className="adm-job">
      <div className="adm-job-top">
        <div>
          <strong>{b.patient?.full_name || '—'}</strong>
          <span className="adm-job-sub">Age {b.patient?.age ?? '—'} · {meta.language || 'No preference'}</span>
        </div>
        <span className="adm-job-ref">{b.reference_code}</span>
      </div>

      <div className="adm-job-hosp">{b.pickup_location?.title || '—'} <em>({meta.department || 'General'})</em></div>

      <dl className="adm-kv">
        <div><dt>Date/Time</dt><dd>{when}</dd></div>
        <div><dt>Cust phone</dt><dd>{meta.customerPhone || '—'}</dd></div>
        <div><dt>Cust email</dt><dd>{meta.customerEmail || '—'}</dd></div>
        <div><dt>Emergency</dt><dd>{b.patient?.emergency_contact_phone || '—'}</dd></div>
        <div><dt>Plan</dt><dd>{meta.originalService || b.service_type}</dd></div>
      </dl>

      {b.special_instructions && <div className="adm-job-note"><strong>Note:</strong> {b.special_instructions}</div>}

      <div className="adm-controls">
        <label>Companion assignment</label>
        <select className="adm-select" value={edit.companionId} onChange={(e) => onEdit({ companionId: e.target.value })}>
          <option value="">Unassigned</option>
          {companions.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name} ({(c.specialties || [])[0] || 'General Care'})</option>
          ))}
        </select>
        {companions.length === 0 && (
          <span className="adm-hint">No approved companions yet — approve one under Companions.</span>
        )}

        <label>Milestone status</label>
        <select className="adm-select" value={edit.status} onChange={(e) => onEdit({ status: e.target.value })}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="save-row">
          <Button variant="primary" size="sm" full disabled={!dirty || saving} onClick={onSave}
            iconLeft={saving ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : undefined}>
            {saving ? 'Saving…' : dirty ? 'Save updates' : 'Up to date'}
          </Button>
        </div>
      </div>
    </article>
  );
}
