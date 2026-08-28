'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Badge, Input } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels, useToast, relativeTime } from '@/components/AdminShell';
import {
  Check, X, Ban, RotateCcw, FileText, Phone, MapPin, Clock, Car,
} from 'lucide-react';

// Admin approval queue. Lists companion applications, shows their KYC documents
// (signed URLs from the private bucket), and lets an admin approve / reject /
// suspend. Mutations are OPTIMISTIC: the UI updates instantly and the DB write
// happens in the background, so an approve/reject feels immediate instead of
// blocking on a round trip + refetch. All rows are fetched once and filtered
// client-side, so switching tabs is instant and counts are free.

import type { ApprovalStatus } from '@caresy/types';

interface CompanionRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  years_experience: number | null;
  languages: string[] | null;
  specialties: string[] | null;
  service_pincodes: string[] | null;
  bio: string | null;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  is_online: boolean;
  created_at: string;
  // Driving eligibility (migration 27). can_drive defaults FALSE and only an
  // admin may set it, so without this screen every CUSTOMER_VEHICLE booking was
  // undispatchable — the database rejected the assignment and nothing in the
  // product could ever clear it.
  driving_licence_number: string | null;
  driving_licence_expiry: string | null;
  driving_licence_class: string | null;
  can_drive: boolean;
  drive_verified_at: string | null;
}

interface DocRow { id: string; doc_type: string; file_path: string; status: string; }

const FILTERS: { key: ApprovalStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'ALL', label: 'All' },
];

const STATUS_TONE: Record<ApprovalStatus, 'teal' | 'success' | 'urgent' | 'neutral'> = {
  PENDING_REVIEW: 'teal', APPROVED: 'success', REJECTED: 'urgent', SUSPENDED: 'neutral',
};

function statusLabel(s: ApprovalStatus): string {
  return s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function AdminCompanions() {
  return (
    <AdminShell title="Companion applications" subtitle="Review KYC and approve, reject, or suspend companions." maxWidth={860}>
      <AdminGuard purpose="review companion applications">
        <CompanionsBody />
      </AdminGuard>
    </AdminShell>
  );
}

function CompanionsBody() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();
  const [all, setAll] = useState<CompanionRow[] | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING_REVIEW');
  const [active, setActive] = useState<CompanionRow | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ companion: CompanionRow; status: ApprovalStatus; rejection?: string; refs: string; count: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('companions').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (alive) setAll((data as CompanionRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (all ?? []).forEach((r) => { c[r.approval_status] = (c[r.approval_status] || 0) + 1; });
    return c;
  }, [all]);

  const rows = useMemo(
    () => (all ?? []).filter((c) => filter === 'ALL' || c.approval_status === filter),
    [all, filter],
  );

  const doApplyStatus = useCallback(
    async (companion: CompanionRow, status: ApprovalStatus, rejection?: string) => {

      const snapshot = all;
      setAll((cur) => (cur ?? []).map((c) => c.id === companion.id
        ? { ...c, approval_status: status, rejection_reason: rejection ?? null,
            is_online: status === 'APPROVED' ? c.is_online : false }
        : c));
      setActive(null);
      const verb = status === 'APPROVED'
        ? (companion.approval_status === 'SUSPENDED' ? 'reinstated' : 'approved')
        : status === 'REJECTED' ? 'rejected'
        : status === 'SUSPENDED' ? 'suspended' : 'moved to pending';
      show(`${companion.full_name} ${verb}.`);

      const { error } = await supabase.from('companions').update({
        approval_status: status,
        rejection_reason: rejection ?? null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        ...(status !== 'APPROVED' ? { is_online: false } : {}),
      }).eq('id', companion.id);

      if (error) {
        setAll(snapshot);
        show(error.message, 'err');
      }
    },
    [all, supabase, user?.id, show],
  );

  // Two-step confirm for destructive suspend/reject when the companion has
  // live jobs — replaces the native window.confirm with the app's own
  // Confirm/Cancel buttons (same pattern as payments page).
  const requestStatus = useCallback(
    async (companion: CompanionRow, status: ApprovalStatus, rejection?: string) => {
      if (status === 'SUSPENDED' || status === 'REJECTED') {
        const { data: liveJobs } = await supabase
          .from('bookings')
          .select('id, reference_code, status')
          .eq('companion_user_id', companion.id)
          .in('status', ['ACCEPTED', 'IN_PROGRESS'])
          .is('deleted_at', null)
          .limit(10);
        if (liveJobs && liveJobs.length > 0) {
          const refs = liveJobs.map((j: { reference_code: string | null; id: string }) => j.reference_code || j.id.slice(0, 8)).join(', ');
          setPendingConfirm({ companion, status, rejection, refs, count: liveJobs.length });
          return;
        }
      }
      await doApplyStatus(companion, status, rejection);
    },
    [supabase, doApplyStatus],
  );

  const pendingCount = counts['PENDING_REVIEW'] || 0;

  return (
    <>
      <div className="adm-pills">
        {FILTERS.map((f) => {
          const activeF = filter === f.key;
          const n = f.key === 'ALL' ? (all?.length ?? 0) : counts[f.key] || 0;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`adm-pill${activeF ? ' is-active' : ''}`}>
              {f.label}{n > 0 && <span className="adm-pill-n">{n}</span>}
            </button>
          );
        })}
        {pendingCount > 0 && (
          <div className="adm-live-chip" style={{ marginLeft: 'auto' }}>
            <span className="dot" /> {pendingCount} awaiting review
          </div>
        )}
      </div>

      {all === null ? (
        <Skels n={4} h={78} />
      ) : rows.length === 0 ? (
        <div className="adm-empty">No companions in this view.</div>
      ) : (
        <div className="adm-list">
          {rows.map((c) => (
            <button key={c.id} className="adm-card adm-row is-click" onClick={() => setActive(c)}>
              <div className="adm-avatar">{c.full_name.charAt(0).toUpperCase()}</div>
              <div className="adm-row-main">
                <div className="adm-name-row">
                  <strong>{c.full_name}</strong>
                  <Badge tone={STATUS_TONE[c.approval_status]} size="sm">{statusLabel(c.approval_status)}</Badge>
                </div>
                <div className="adm-meta">
                  {c.phone && <span><Phone />{c.phone}</span>}
                  {c.service_pincodes && c.service_pincodes.length > 0 && <span><MapPin />{c.service_pincodes.join(', ')}</span>}
                  {c.years_experience != null && <span>{c.years_experience} yrs exp</span>}
                  <span className="adm-time"><Clock />{relativeTime(c.created_at)}</span>
                </div>
                {c.rejection_reason && c.approval_status === 'REJECTED' && (
                  <div className="adm-reject-reason">Reason: {c.rejection_reason}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {pendingConfirm && (
        <div className="adm-sheet-overlay" onClick={() => setPendingConfirm(null)}>
          <div className="adm-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Active jobs will be left without a companion</h3>
            <p className="adm-hint" style={{ display: 'block', marginBottom: 16 }}>
              {pendingConfirm.companion.full_name} has {pendingConfirm.count} active job(s) ({pendingConfirm.refs}) in ACCEPTED/IN_PROGRESS. Suspending/rejecting now will leave those visits without a companion.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setPendingConfirm(null)}>Cancel</Button>
              <Button variant="urgent" onClick={async () => { const p = pendingConfirm; setPendingConfirm(null); if (p) await doApplyStatus(p.companion, p.status, p.rejection); }}>{pendingConfirm.status === 'SUSPENDED' ? 'Suspend anyway' : 'Reject anyway'}</Button>
            </div>
          </div>
        </div>
      )}

      {active && (
        <ReviewSheet companion={active} supabase={supabase}
          onClose={() => setActive(null)} onAction={requestStatus}
          onDrivingSaved={(patch) => {
            setAll((cur) => (cur ?? []).map((c) => c.id === active.id ? { ...c, ...patch } : c));
            setActive((cur) => (cur ? { ...cur, ...patch } : cur));
          }}
          onToast={show} />
      )}

      {toastNode}
    </>
  );
}

// ---------------------------------------------------------------------------

function ReviewSheet({
  companion, supabase, onClose, onAction, onDrivingSaved, onToast,
}: {
  companion: CompanionRow;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onAction: (c: CompanionRow, status: ApprovalStatus, rejection?: string) => void;
  onDrivingSaved: (patch: Partial<CompanionRow>) => void;
  onToast: (msg: string, kind?: 'ok' | 'err') => void;
}) {
  const [docs, setDocs] = useState<(DocRow & { signedUrl?: string })[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('companion_documents')
        .select('id, doc_type, file_path, status').eq('companion_id', companion.id);
      const list = (data as DocRow[]) ?? [];
      const withUrls = await Promise.all(list.map(async (d) => {
        const { data: signed } = await supabase.storage.from('companion-docs').createSignedUrl(d.file_path, 600);
        return { ...d, signedUrl: signed?.signedUrl };
      }));
      if (alive) { setDocs(withUrls); setLoadingDocs(false); }
    })();
    return () => { alive = false; };
  }, [companion.id, supabase]);

  const s = companion;
  return (
    <div className="adm-sheet-overlay" onClick={onClose}>
      <div className="adm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="adm-grab" />
        <button className="adm-sheet-close" onClick={onClose} aria-label="Close"><X style={{ width: 18, height: 18 }} /></button>

        <div className="adm-sheet-head">
          <div className="adm-avatar lg">{s.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="adm-name-row">
              <h2>{s.full_name}</h2>
              <Badge tone={STATUS_TONE[s.approval_status]} size="sm">{statusLabel(s.approval_status)}</Badge>
            </div>
            <div className="adm-sheet-email">{s.email}</div>
          </div>
        </div>

        <div className="adm-details">
          <Detail label="Phone" value={s.phone} />
          <Detail label="Gender" value={s.gender} />
          <Detail label="Date of birth" value={s.date_of_birth} />
          <Detail label="Experience" value={s.years_experience != null ? `${s.years_experience} years` : null} />
          <Detail label="Pincodes" value={s.service_pincodes?.join(', ') || null} />
          <Detail label="Languages" value={s.languages?.join(', ') || null} />
          <Detail label="Specialties" value={s.specialties?.join(', ') || null} />
        </div>
        {s.bio && <p className="adm-bio">{s.bio}</p>}

        <h3 className="adm-sec">Verification documents</h3>
        {loadingDocs ? (
          <div className="adm-docs">{[0, 1, 2].map((i) => <div key={i} className="adm-skel" style={{ height: 60 }} />)}</div>
        ) : docs.length === 0 ? (
          <p className="adm-hint" style={{ display: 'block', marginBottom: 16 }}>No documents uploaded.</p>
        ) : (
          <div className="adm-docs">
            {docs.map((d) => (
              <a key={d.id} href={d.signedUrl} target="_blank" rel="noopener" className="adm-doc">
                <span className="adm-doc-ico"><FileText style={{ width: 17, height: 17 }} /></span>
                <span className="adm-doc-name">{d.doc_type.replace('_', ' ').toLowerCase()}</span>
                <span className="adm-doc-view">View →</span>
              </a>
            ))}
          </div>
        )}

        <DrivingPanel companion={s} supabase={supabase} onSaved={onDrivingSaved} onToast={onToast} />

        <div className="adm-actions">
          {rejecting ? (
            <div className="adm-reject-form">
              <Input label="Reason for rejection" multiline rows={2} value={reason}
                onChange={(e) => setReason(e.target.value)} placeholder="Shared with the companion." />
              <div className="adm-action-row">
                <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="urgent" full disabled={!reason.trim()}
                  onClick={() => onAction(s, 'REJECTED', reason.trim())}
                  iconLeft={<X style={{ width: 16, height: 16 }} />}>Confirm rejection</Button>
              </div>
            </div>
          ) : (
            <div className="adm-action-row">
              {s.approval_status !== 'APPROVED' && (
                <Button variant="primary" onClick={() => onAction(s, 'APPROVED')}
                  iconLeft={<Check style={{ width: 16, height: 16 }} />}>
                  {s.approval_status === 'SUSPENDED' ? 'Reinstate' : 'Approve'}
                </Button>
              )}
              {s.approval_status !== 'REJECTED' && (
                <Button variant="outline" onClick={() => setRejecting(true)}
                  iconLeft={<X style={{ width: 16, height: 16 }} />}>Reject</Button>
              )}
              {s.approval_status === 'APPROVED' && (
                <Button variant="ghost" style={{ color: 'var(--terracotta)' }} onClick={() => onAction(s, 'SUSPENDED')}
                  iconLeft={<Ban style={{ width: 16, height: 16 }} />}>Suspend</Button>
              )}
              {s.approval_status === 'REJECTED' && (
                <Button variant="ghost" onClick={() => onAction(s, 'PENDING_REVIEW')}
                  iconLeft={<RotateCcw style={{ width: 16, height: 16 }} />}>Move to pending</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Driving verification — the gate that had no door.
 *
 * `companions.can_drive` defaults FALSE and a database trigger refuses to
 * assign a CUSTOMER_VEHICLE booking to anyone it is false for. Nothing in any
 * app could set it, so a customer choosing "companion drives our vehicle" made
 * a booking that could never be dispatched, and the only symptom was a raw
 * Postgres error when someone tried.
 *
 * Expiry is stored, not just eyeballed: companion_may_drive() re-checks it at
 * assignment time, so a licence that lapses next month stops working by itself.
 */
function DrivingPanel({
  companion, supabase, onSaved, onToast,
}: {
  companion: CompanionRow;
  supabase: ReturnType<typeof createClient>;
  onSaved: (patch: Partial<CompanionRow>) => void;
  onToast: (msg: string, kind?: 'ok' | 'err') => void;
}) {
  const { user } = useAuth();
  const [number, setNumber] = useState(companion.driving_licence_number ?? '');
  const [expiry, setExpiry] = useState(companion.driving_licence_expiry ?? '');
  const [cls, setCls] = useState(companion.driving_licence_class ?? '');
  const [saving, setSaving] = useState(false);

  const expired = expiry !== '' && new Date(expiry) < new Date(new Date().toDateString());

  const write = async (canDrive: boolean) => {
    setSaving(true);
    const patch = {
      driving_licence_number: number.trim() || null,
      driving_licence_expiry: expiry || null,
      driving_licence_class: cls.trim() || null,
      can_drive: canDrive,
      drive_verified_by: canDrive ? user?.id ?? null : null,
      drive_verified_at: canDrive ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('companions').update(patch).eq('id', companion.id);
    setSaving(false);
    if (error) { onToast(error.message, 'err'); return; }
    onSaved(patch as Partial<CompanionRow>);
    onToast(canDrive ? `${companion.full_name} cleared for driving jobs.` : 'Driving clearance removed.');
  };

  return (
    <>
      <h3 className="adm-sec">Driving licence</h3>
      <p className="adm-hint" style={{ display: 'block', marginBottom: 12 }}>
        Only needed for bookings where the companion drives the customer&rsquo;s own car or bike.
        Check the uploaded licence against these fields before clearing anyone — an invalid
        licence can void the customer&rsquo;s own-damage claim.
      </p>

      {companion.can_drive && (
        <div className="adm-live-chip" style={{ marginBottom: 12 }}>
          <span className="dot" /> Cleared for driving jobs
          {companion.drive_verified_at ? ` · ${relativeTime(companion.drive_verified_at)}` : ''}
        </div>
      )}

      <div className="adm-details">
        <Input label="Licence number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="UP16 2019 0001234" />
        <Input label="Expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
          hint={expired ? 'Expired — assignment will be refused.' : undefined} />
        <Input label="Class" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="LMV" />
      </div>

      <div className="adm-action-row" style={{ marginTop: 12 }}>
        {companion.can_drive ? (
          <Button variant="ghost" style={{ color: 'var(--terracotta)' }} disabled={saving} onClick={() => write(false)}
            iconLeft={<Ban style={{ width: 16, height: 16 }} />}>Remove driving clearance</Button>
        ) : (
          <Button variant="primary" disabled={saving || !number.trim() || !expiry || expired || companion.approval_status !== 'APPROVED'}
            onClick={() => write(true)} iconLeft={<Car style={{ width: 16, height: 16 }} />}>
            {saving ? 'Saving…' : 'Clear for driving jobs'}
          </Button>
        )}
      </div>
      {companion.approval_status !== 'APPROVED' && !companion.can_drive && (
        <span className="adm-hint">Approve the companion first — driving clearance requires an approved account.</span>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="adm-dl">{label}</div>
      <div className="adm-dv">{value || '—'}</div>
    </div>
  );
}
