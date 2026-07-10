'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Button, Badge, Input } from '@caresy/ui';
import { AdminNav } from '@/components/AdminNav';
import {
  Loader2, ShieldCheck, Check, X, Ban, RotateCcw, FileText, Phone, MapPin,
} from 'lucide-react';

// Admin approval queue — the other half of the Phase-1/Phase-2 slice. Lists
// companion applications, shows their KYC documents (signed URLs from the
// private bucket), and lets an admin approve / reject / suspend. Writes to the
// privileged fields are permitted here because the DB is_admin() check passes.

type ApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

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

export default function AdminCompanions() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING_REVIEW');
  const [rows, setRows] = useState<CompanionRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CompanionRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from('companions').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (filter !== 'ALL') query = query.eq('approval_status', filter);
    const { data } = await query;
    setRows((data as CompanionRow[]) ?? []);

    // Counts per status for the filter badges.
    const { data: all } = await supabase.from('companions').select('approval_status').is('deleted_at', null);
    const c: Record<string, number> = {};
    (all ?? []).forEach((r: { approval_status: string }) => { c[r.approval_status] = (c[r.approval_status] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  }, [isAdmin, filter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  if (isLoading) {
    return <main style={{ minHeight: '60vh', paddingTop: 118, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '138px 20px 48px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to review companion applications.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/companions')}>Sign in</Button>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '118px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Companion applications</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>Review KYC and approve, reject, or suspend companions.</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const activeF = filter === f.key;
          const n = f.key === 'ALL' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[f.key] || 0;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700,
              border: `1px solid ${activeF ? 'var(--teal)' : 'var(--line)'}`,
              background: activeF ? 'var(--teal)' : 'var(--surface)', color: activeF ? '#fff' : 'var(--ink-teal)',
            }}>
              {f.label} {n > 0 && <span style={{ opacity: 0.85 }}>({n})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-lg)' }}>No companions in this view.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((c) => (
            <div key={c.id} style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 800, flexShrink: 0 }}>{c.full_name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--ink-teal)' }}>{c.full_name}</strong>
                    <Badge tone={STATUS_TONE[c.approval_status]} size="sm">{c.approval_status.replace('_', ' ').toLowerCase()}</Badge>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone style={{ width: 12, height: 12 }} />{c.phone}</span>}
                    {c.service_pincodes && c.service_pincodes.length > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 12, height: 12 }} />{c.service_pincodes.join(', ')}</span>}
                    {c.years_experience != null && <span>{c.years_experience} yrs exp</span>}
                  </div>
                  {c.rejection_reason && c.approval_status === 'REJECTED' && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--terracotta-deep)', marginTop: 6 }}>Reason: {c.rejection_reason}</div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setActive(c)}>Review</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <ReviewSheet companion={active} onClose={() => setActive(null)}
          onDone={(msg) => { setActive(null); showToast(msg); fetchRows(); }} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '12px 20px', borderRadius: 999, background: 'var(--ink-teal)', color: '#fff', fontSize: '0.86rem', fontWeight: 600, boxShadow: 'var(--shadow-3, 0 10px 30px rgba(0,0,0,0.2))' }}>{toast}</div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function ReviewSheet({ companion, onClose, onDone }: { companion: CompanionRow; onClose: () => void; onDone: (msg: string) => void }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<(DocRow & { signedUrl?: string })[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('companion_documents').select('id, doc_type, file_path, status').eq('companion_id', companion.id);
      const list = (data as DocRow[]) ?? [];
      // Private bucket -> generate short-lived signed URLs for viewing.
      const withUrls = await Promise.all(list.map(async (d) => {
        const { data: signed } = await supabase.storage.from('companion-docs').createSignedUrl(d.file_path, 600);
        return { ...d, signedUrl: signed?.signedUrl };
      }));
      setDocs(withUrls);
      setLoadingDocs(false);
    })();
  }, [companion.id]);

  const setStatus = async (status: ApprovalStatus, rejection?: string) => {
    if (!user) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('companions').update({
      approval_status: status,
      rejection_reason: rejection ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(status !== 'APPROVED' ? { is_online: false } : {}),
    }).eq('id', companion.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    const verb = status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'suspended';
    onDone(`${companion.full_name} ${verb}.`);
  };

  const s = companion;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(22,48,43,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', background: 'var(--paper)', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '10px 20px 28px', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '8px auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>{s.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink-teal)' }}>{s.full_name}</h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{s.email}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <Detail label="Phone" value={s.phone} />
          <Detail label="Gender" value={s.gender} />
          <Detail label="Date of birth" value={s.date_of_birth} />
          <Detail label="Experience" value={s.years_experience != null ? `${s.years_experience} years` : null} />
          <Detail label="Pincodes" value={s.service_pincodes?.join(', ') || null} />
          <Detail label="Languages" value={s.languages?.join(', ') || null} />
          <Detail label="Specialties" value={s.specialties?.join(', ') || null} />
        </div>
        {s.bio && <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: 'var(--ink-teal)', padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>{s.bio}</p>}

        {/* KYC documents */}
        <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--ink-teal)' }}>Verification documents</h3>
        {loadingDocs ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}><Loader2 className="animate-spin" style={{ width: 20, height: 20, color: 'var(--teal)' }} /></div>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>No documents uploaded.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {docs.map((d) => (
              <a key={d.id} href={d.signedUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)', textDecoration: 'none' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 9, background: 'var(--teal-soft)', color: 'var(--teal)' }}><FileText style={{ width: 17, height: 17 }} /></span>
                <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{d.doc_type.replace('_', ' ').toLowerCase()}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--teal)', fontWeight: 700 }}>View →</span>
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        {rejecting ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Input label="Reason for rejection" multiline rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shared with the companion." />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
              <Button variant="urgent" full disabled={busy || !reason.trim()} onClick={() => setStatus('REJECTED', reason.trim())}
                iconLeft={busy ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <X style={{ width: 16, height: 16 }} />}>
                Confirm rejection
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {s.approval_status !== 'APPROVED' && (
              <Button variant="primary" onClick={() => setStatus('APPROVED')} disabled={busy}
                iconLeft={busy ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Check style={{ width: 16, height: 16 }} />}>
                {s.approval_status === 'SUSPENDED' ? 'Reinstate' : 'Approve'}
              </Button>
            )}
            {s.approval_status !== 'REJECTED' && (
              <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}
                iconLeft={<X style={{ width: 16, height: 16 }} />}>Reject</Button>
            )}
            {s.approval_status === 'APPROVED' && (
              <Button variant="ghost" style={{ color: 'var(--terracotta)' }} onClick={() => setStatus('SUSPENDED')} disabled={busy}
                iconLeft={<Ban style={{ width: 16, height: 16 }} />}>Suspend</Button>
            )}
            {s.approval_status === 'REJECTED' && (
              <Button variant="ghost" onClick={() => setStatus('PENDING_REVIEW')} disabled={busy}
                iconLeft={<RotateCcw style={{ width: 16, height: 16 }} />}>Move to pending</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--ink-teal)', fontWeight: 600 }}>{value || '—'}</div>
    </div>
  );
}
