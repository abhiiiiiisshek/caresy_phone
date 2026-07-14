'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Badge, Input } from '@caresy/ui';
import { AdminNav } from '@/components/AdminNav';
import {
  Loader2, ShieldCheck, Check, X, Ban, RotateCcw, FileText, Phone, MapPin, Clock,
} from 'lucide-react';
import './companions.css';

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
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}m ago` : 'just now';
}

interface Toast { msg: string; tone: 'ok' | 'err'; }

export default function AdminCompanions() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [all, setAll] = useState<CompanionRow[] | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING_REVIEW');
  const [active, setActive] = useState<CompanionRow | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from('companions').select('*').is('deleted_at', null)
      .order('created_at', { ascending: false });
    setAll((data as CompanionRow[]) ?? []);
  }, [isAdmin, supabase]);

  useEffect(() => { load(); }, [load]);

  const showToast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (all ?? []).forEach((r) => { c[r.approval_status] = (c[r.approval_status] || 0) + 1; });
    return c;
  }, [all]);

  const rows = useMemo(
    () => (all ?? []).filter((c) => filter === 'ALL' || c.approval_status === filter),
    [all, filter],
  );

  // Optimistic: update the row locally + close the sheet immediately, then write
  // to the DB in the background. Revert on error.
  const applyStatus = useCallback(
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
      showToast(`${companion.full_name} ${verb}.`);

      const { error } = await supabase.from('companions').update({
        approval_status: status,
        rejection_reason: rejection ?? null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        ...(status !== 'APPROVED' ? { is_online: false } : {}),
      }).eq('id', companion.id);

      if (error) {
        setAll(snapshot);
        showToast(error.message, 'err');
      }
    },
    [all, supabase, user?.id, showToast],
  );

  if (isLoading) {
    return <main className="cmp-center"><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main className="cmp-gate">
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1>Admin access required</h1>
        <p>Sign in with an authorized ops account to review companion applications.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/companions')}>Sign in</Button>}
      </main>
    );
  }

  const pendingCount = counts['PENDING_REVIEW'] || 0;

  return (
    <main className="cmp-wrap">
      <AdminNav />

      <header className="cmp-head">
        <div>
          <h1>Companion applications</h1>
          <p>Review KYC and approve, reject, or suspend companions.</p>
        </div>
        {pendingCount > 0 && (
          <div className="cmp-pending-chip">
            <span className="dot" /> {pendingCount} awaiting review
          </div>
        )}
      </header>

      <div className="cmp-filters">
        {FILTERS.map((f) => {
          const activeF = filter === f.key;
          const n = f.key === 'ALL' ? (all?.length ?? 0) : counts[f.key] || 0;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`cmp-pill${activeF ? ' is-active' : ''}`}>
              {f.label}{n > 0 && <span className="cmp-pill-n">{n}</span>}
            </button>
          );
        })}
      </div>

      {all === null ? (
        <div className="cmp-list">
          {[0, 1, 2, 3].map((i) => <div key={i} className="cmp-skel" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="cmp-empty">No companions in this view.</div>
      ) : (
        <div className="cmp-list">
          {rows.map((c) => (
            <button key={c.id} className="cmp-card" onClick={() => setActive(c)}>
              <div className="cmp-avatar">{c.full_name.charAt(0).toUpperCase()}</div>
              <div className="cmp-main">
                <div className="cmp-name-row">
                  <strong>{c.full_name}</strong>
                  <Badge tone={STATUS_TONE[c.approval_status]} size="sm">{statusLabel(c.approval_status)}</Badge>
                </div>
                <div className="cmp-meta">
                  {c.phone && <span><Phone />{c.phone}</span>}
                  {c.service_pincodes && c.service_pincodes.length > 0 && <span><MapPin />{c.service_pincodes.join(', ')}</span>}
                  {c.years_experience != null && <span>{c.years_experience} yrs exp</span>}
                  <span className="cmp-time"><Clock />{relativeTime(c.created_at)}</span>
                </div>
                {c.rejection_reason && c.approval_status === 'REJECTED' && (
                  <div className="cmp-reject">Reason: {c.rejection_reason}</div>
                )}
              </div>
              <span className="cmp-review-hint">Review →</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <ReviewSheet companion={active} supabase={supabase}
          onClose={() => setActive(null)} onAction={applyStatus} />
      )}

      {toast && <div className={`cmp-toast ${toast.tone}`}>{toast.msg}</div>}
    </main>
  );
}

// ---------------------------------------------------------------------------

function ReviewSheet({
  companion, supabase, onClose, onAction,
}: {
  companion: CompanionRow;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onAction: (c: CompanionRow, status: ApprovalStatus, rejection?: string) => void;
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
    <div className="cmp-sheet-overlay" onClick={onClose}>
      <div className="cmp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cmp-grab" />
        <button className="cmp-sheet-close" onClick={onClose} aria-label="Close"><X style={{ width: 18, height: 18 }} /></button>

        <div className="cmp-sheet-head">
          <div className="cmp-avatar lg">{s.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="cmp-name-row">
              <h2>{s.full_name}</h2>
              <Badge tone={STATUS_TONE[s.approval_status]} size="sm">{statusLabel(s.approval_status)}</Badge>
            </div>
            <div className="cmp-sheet-email">{s.email}</div>
          </div>
        </div>

        <div className="cmp-detail-grid">
          <Detail label="Phone" value={s.phone} />
          <Detail label="Gender" value={s.gender} />
          <Detail label="Date of birth" value={s.date_of_birth} />
          <Detail label="Experience" value={s.years_experience != null ? `${s.years_experience} years` : null} />
          <Detail label="Pincodes" value={s.service_pincodes?.join(', ') || null} />
          <Detail label="Languages" value={s.languages?.join(', ') || null} />
          <Detail label="Specialties" value={s.specialties?.join(', ') || null} />
        </div>
        {s.bio && <p className="cmp-bio">{s.bio}</p>}

        <h3 className="cmp-sec">Verification documents</h3>
        {loadingDocs ? (
          <div className="cmp-docs">{[0, 1, 2].map((i) => <div key={i} className="cmp-doc-skel" />)}</div>
        ) : docs.length === 0 ? (
          <p className="cmp-nodocs">No documents uploaded.</p>
        ) : (
          <div className="cmp-docs">
            {docs.map((d) => (
              <a key={d.id} href={d.signedUrl} target="_blank" rel="noopener" className="cmp-doc">
                <span className="cmp-doc-ico"><FileText style={{ width: 17, height: 17 }} /></span>
                <span className="cmp-doc-name">{d.doc_type.replace('_', ' ').toLowerCase()}</span>
                <span className="cmp-doc-view">View →</span>
              </a>
            ))}
          </div>
        )}

        <div className="cmp-actions">
          {rejecting ? (
            <div className="cmp-reject-form">
              <Input label="Reason for rejection" multiline rows={2} value={reason}
                onChange={(e) => setReason(e.target.value)} placeholder="Shared with the companion." />
              <div className="cmp-action-row">
                <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="urgent" full disabled={!reason.trim()}
                  onClick={() => onAction(s, 'REJECTED', reason.trim())}
                  iconLeft={<X style={{ width: 16, height: 16 }} />}>Confirm rejection</Button>
              </div>
            </div>
          ) : (
            <div className="cmp-action-row">
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

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="cmp-detail">
      <div className="cmp-detail-l">{label}</div>
      <div className="cmp-detail-v">{value || '—'}</div>
    </div>
  );
}
