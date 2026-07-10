'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Input, Button, Badge } from '@caresy/ui';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Ban, Upload, FileCheck2,
  Loader2, LogIn, Power, MapPin, Briefcase, PlayCircle, Inbox,
} from 'lucide-react';

// Companion portal — one page that branches on the signed-in user's companion
// record: register -> pending review -> approved (basic dashboard) / rejected
// (re-apply) / suspended. The nearby-jobs feed and accept/reject flow land in
// Phase 2 proper; this slice covers registration + KYC and the approval states
// so the admin approval queue can be tested end to end.

const LANGUAGE_OPTIONS = ['Hindi', 'English', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Urdu'];
const SPECIALTY_OPTIONS = ['Elderly care', 'Cardiology', 'Orthopedics', 'Oncology', 'Diagnostics', 'Post-surgery', 'Maternity', 'General'];
const DOC_TYPES = [
  { key: 'AADHAAR', label: 'Aadhaar card', hint: 'Front side, clearly readable' },
  { key: 'POLICE_VERIFICATION', label: 'Police verification', hint: 'Certificate or acknowledgement' },
  { key: 'PHOTO_ID', label: 'Photo / selfie', hint: 'A recent clear headshot' },
] as const;

type ApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

interface CompanionRow {
  id: string;
  full_name: string;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  is_online: boolean;
}

export default function CompanionPortal() {
  const { user, isLoading, openLogin, profile } = useAuth();
  const [companion, setCompanion] = useState<CompanionRow | null>(null);
  const [loadingRow, setLoadingRow] = useState(true);

  const fetchCompanion = useCallback(async () => {
    if (!user) { setCompanion(null); setLoadingRow(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('companions')
      .select('id, full_name, approval_status, rejection_reason, is_online')
      .eq('id', user.id)
      .maybeSingle();
    setCompanion((data as CompanionRow) ?? null);
    setLoadingRow(false);
  }, [user]);

  useEffect(() => { fetchCompanion(); }, [fetchCompanion]);

  if (isLoading || loadingRow) {
    return (
      <main className="app-shell-page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell-page" style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-soft)', color: 'var(--teal)', margin: '0 auto 18px' }}>
            <ShieldCheck style={{ width: 30, height: 30 }} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Become a Caresy companion</h1>
          <p style={{ margin: '0 0 22px', color: 'var(--muted)' }}>
            Join our verified network of hospital companions. Sign in to start your registration.
          </p>
          <Button variant="primary" iconLeft={<LogIn style={{ width: 16, height: 16 }} />} onClick={() => openLogin('/companion')}>
            Sign in to continue
          </Button>
        </div>
      </main>
    );
  }

  if (!companion) {
    return <RegistrationForm onDone={fetchCompanion} defaultName={profile?.full_name || (user.user_metadata?.full_name as string) || ''} defaultPhone={profile?.phone || ''} />;
  }

  if (companion.approval_status === 'PENDING_REVIEW') return <StatusCard kind="pending" name={companion.full_name} />;
  if (companion.approval_status === 'REJECTED') return <StatusCard kind="rejected" name={companion.full_name} reason={companion.rejection_reason} onReapply={fetchCompanion} />;
  if (companion.approval_status === 'SUSPENDED') return <StatusCard kind="suspended" name={companion.full_name} />;
  return <ApprovedDashboard companion={companion} onChange={fetchCompanion} />;
}

// ---------------------------------------------------------------------------

function RegistrationForm({ onDone, defaultName, defaultPhone }: { onDone: () => void; defaultName: string; defaultPhone: string }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [years, setYears] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const missingDocs = DOC_TYPES.filter((d) => !files[d.key]).map((d) => d.label);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!fullName.trim() || !phone.trim()) { setError('Name and phone are required.'); return; }
    if (missingDocs.length) { setError(`Please upload: ${missingDocs.join(', ')}.`); return; }

    setSubmitting(true);
    const supabase = createClient();
    try {
      const pincodeList = pincodes.split(',').map((p) => p.trim()).filter(Boolean);

      // 1. Create the companion row (defaults to PENDING_REVIEW; the DB guard
      //    forces that for non-admins regardless of what we send).
      const { error: cErr } = await supabase.from('companions').upsert({
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: user.email,
        date_of_birth: dob || null,
        gender: gender || null,
        years_experience: years ? Number(years) : null,
        service_pincodes: pincodeList,
        languages,
        specialties,
        bio: bio.trim() || null,
      });
      if (cErr) throw cErr;

      // 2. Upload each KYC file into the companion's own folder, then record it.
      for (const doc of DOC_TYPES) {
        const file = files[doc.key];
        if (!file) continue;
        const ext = file.name.split('.').pop() || 'dat';
        const path = `${user.id}/${doc.key}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('companion-docs')
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { error: dErr } = await supabase.from('companion_documents').insert({
          companion_id: user.id,
          doc_type: doc.key,
          file_path: path,
        });
        if (dErr) throw dErr;
      }

      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
    border: `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
    background: active ? 'var(--teal-soft)' : 'var(--surface)',
    color: active ? 'var(--teal-deep)' : 'var(--ink-teal)',
  });

  return (
    <main className="app-shell-page" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Companion registration</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--muted)', fontSize: '0.92rem' }}>
        Tell us about yourself and upload your documents. Our team reviews every application before you can take jobs.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Male / Female / Other" />
          <Input label="Years of experience" type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
        <Input label="Service pincodes" value={pincodes} onChange={(e) => setPincodes(e.target.value)}
          placeholder="201301, 201310" hint="Comma-separated pincodes you can serve (Noida / Greater Noida)." />

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink-teal)', marginBottom: 8 }}>Languages</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGUAGE_OPTIONS.map((l) => (
              <span key={l} onClick={() => toggle(languages, setLanguages, l)} style={chipStyle(languages.includes(l))}>{l}</span>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink-teal)', marginBottom: 8 }}>Specialties</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPECIALTY_OPTIONS.map((s) => (
              <span key={s} onClick={() => toggle(specialties, setSpecialties, s)} style={chipStyle(specialties.includes(s))}>{s}</span>
            ))}
          </div>
        </div>
        <Input label="Short bio" multiline rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence or two about your caregiving background." />

        {/* KYC uploads */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--ink-teal)' }}>Verification documents</h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--muted)' }}>Stored privately and used only for verification.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {DOC_TYPES.map((d) => {
              const f = files[d.key];
              return (
                <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 'var(--radius)', border: `1px solid ${f ? 'var(--teal)' : 'var(--line)'}`, background: 'var(--surface)', cursor: 'pointer' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: f ? 'var(--success-soft)' : 'var(--teal-soft)', color: f ? '#1B7A54' : 'var(--teal)', flexShrink: 0 }}>
                    {f ? <FileCheck2 style={{ width: 18, height: 18 }} /> : <Upload style={{ width: 18, height: 18 }} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{d.label}</span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {f ? f.name : d.hint}
                    </span>
                  </span>
                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={(e) => setFiles((prev) => ({ ...prev, [d.key]: e.target.files?.[0] ?? null }))} />
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', fontSize: '0.84rem', fontWeight: 600 }}>{error}</p>
        )}

        <Button type="submit" variant="primary" full size="lg" disabled={submitting}
          iconLeft={submitting ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <ShieldCheck style={{ width: 18, height: 18 }} />}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------------------

function StatusCard({ kind, name, reason, onReapply }: { kind: 'pending' | 'rejected' | 'suspended'; name: string; reason?: string | null; onReapply?: () => void }) {
  const map = {
    pending: { icon: Clock, tone: 'teal' as const, title: 'Application under review', body: 'Our team is verifying your documents. You’ll be notified once approved — usually within 1–2 business days.' },
    rejected: { icon: XCircle, tone: 'urgent' as const, title: 'Application not approved', body: reason || 'Your application could not be approved this time. You can review your details and re-apply.' },
    suspended: { icon: Ban, tone: 'urgent' as const, title: 'Account suspended', body: 'Your companion account is currently suspended. Please contact Caresy operations for details.' },
  }[kind];
  const Icon = map.icon;

  return (
    <main className="app-shell-page" style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 68, height: 68, borderRadius: '50%', background: kind === 'pending' ? 'var(--teal-soft)' : 'var(--terracotta-soft)', color: kind === 'pending' ? 'var(--teal)' : 'var(--terracotta-deep)', margin: '0 auto 18px' }}>
        <Icon style={{ width: 32, height: 32 }} />
      </div>
      <div style={{ marginBottom: 10 }}><Badge tone={map.tone}>{kind === 'pending' ? 'Pending review' : kind === 'rejected' ? 'Not approved' : 'Suspended'}</Badge></div>
      <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: 'var(--ink-teal)' }}>Hi {name.split(' ')[0]} — {map.title}</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--muted)' }}>{map.body}</p>
      {kind === 'rejected' && onReapply && <ReapplyButton onDone={onReapply} />}
      <p style={{ marginTop: 22, fontSize: '0.82rem' }}>
        <a href="https://wa.me/919717500225" target="_blank" rel="noopener" style={{ color: 'var(--teal)', fontWeight: 700 }}>Questions? Chat with ops on WhatsApp</a>
      </p>
    </main>
  );
}

function ReapplyButton({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const reapply = async () => {
    if (!user) return;
    setBusy(true);
    const supabase = createClient();
    // Owner is allowed to move REJECTED -> PENDING_REVIEW (see migration guard).
    await supabase.from('companions').update({ approval_status: 'PENDING_REVIEW', rejection_reason: null }).eq('id', user.id);
    onDone();
  };
  return (
    <Button variant="primary" onClick={reapply} disabled={busy}
      iconLeft={busy ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : undefined}>
      {busy ? 'Submitting…' : 'Re-submit for review'}
    </Button>
  );
}

// ---------------------------------------------------------------------------

interface JobRow {
  id: string;
  reference_code: string | null;
  service_type: string;
  booking_type: string;
  status: string;
  scheduled_start_time: string | null;
  created_at: string;
  special_instructions: string | null;
  service_metadata: { originalService?: string } | null;
  companion_user_id: string | null;
  pickup?: { title: string | null; pincode: string | null; city: string | null } | null;
  patient?: { full_name: string | null } | null;
}

const JOB_SELECT =
  'id, reference_code, service_type, booking_type, status, scheduled_start_time, created_at, special_instructions, service_metadata, companion_user_id, pickup:locations!pickup_location_id (title, pincode, city), patient:patients!patient_id (full_name)';

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Flexible';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXPIRED: 'Expired', PENDING: 'Pending',
};

function ApprovedDashboard({ companion, onChange }: { companion: CompanionRow; onChange: () => void }) {
  const { user } = useAuth();
  const [online, setOnline] = useState(companion.is_online);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [openJobs, setOpenJobs] = useState<JobRow[]>([]);
  const [myJobs, setMyJobs] = useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [openRes, mineRes] = await Promise.all([
      supabase.from('bookings').select(JOB_SELECT).eq('status', 'PENDING').is('companion_user_id', null).order('created_at', { ascending: false }),
      supabase.from('bookings').select(JOB_SELECT).eq('companion_user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setOpenJobs((openRes.data as unknown as JobRow[]) ?? []);
    setMyJobs((mineRes.data as unknown as JobRow[]) ?? []);
    setLoadingJobs(false);
  }, [user]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const toggleOnline = async () => {
    if (!user) return;
    setTogglingOnline(true);
    const next = !online;
    const supabase = createClient();
    const { error } = await supabase.from('companions')
      .update({ is_online: next, last_online_at: next ? new Date().toISOString() : null })
      .eq('id', user.id);
    if (!error) setOnline(next);
    setTogglingOnline(false);
    onChange();
  };

  const setJobStatus = async (job: JobRow, status: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    setActioning(job.id);
    const supabase = createClient();
    const { error } = await supabase.from('bookings').update({ status, ...extra }).eq('id', job.id);
    setActioning(null);
    if (error) { alert(error.message); return; }
    await fetchJobs();
  };

  const accept = (job: JobRow) => setJobStatus(job, 'ACCEPTED', { companion_user_id: user!.id });

  const activeMine = myJobs.filter((j) => ['ACCEPTED', 'IN_PROGRESS'].includes(j.status));
  const pastMine = myJobs.filter((j) => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(j.status));
  const visibleOpen = openJobs.filter((j) => !hidden.has(j.id));

  return (
    <main className="app-shell-page" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ marginBottom: 6 }}><Badge tone="success" dot>Approved companion</Badge></div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Welcome, {companion.full_name.split(' ')[0]}</h1>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
          {companion.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Availability toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', margin: '16px 0' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: online ? 'var(--success-soft)' : 'rgba(92,107,100,0.14)', color: online ? '#1B7A54' : 'var(--muted)' }}>
          <Power style={{ width: 20, height: 20 }} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink-teal)' }}>{online ? 'You’re online' : 'You’re offline'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{online ? 'Open job requests are shown below.' : 'Go online to see and accept job requests.'}</div>
        </div>
        <Button variant={online ? 'outline' : 'primary'} size="sm" onClick={toggleOnline} disabled={togglingOnline}>
          {togglingOnline ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : online ? 'Go offline' : 'Go online'}
        </Button>
      </div>

      {loadingJobs ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 32 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : (
        <>
          {/* My active jobs */}
          {activeMine.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <SectionTitle icon={Briefcase} label={`Your active jobs (${activeMine.length})`} />
              <div style={{ display: 'grid', gap: 10 }}>
                {activeMine.map((job) => (
                  <JobCard key={job.id} job={job} showPatient>
                    {job.status === 'ACCEPTED' && (
                      <Button variant="primary" size="sm" disabled={actioning === job.id} onClick={() => setJobStatus(job, 'IN_PROGRESS', { actual_start_time: new Date().toISOString() })}
                        iconLeft={<PlayCircle style={{ width: 15, height: 15 }} />}>Start job</Button>
                    )}
                    {job.status === 'IN_PROGRESS' && (
                      <Button variant="primary" size="sm" disabled={actioning === job.id} onClick={() => setJobStatus(job, 'COMPLETED', { actual_end_time: new Date().toISOString() })}
                        iconLeft={<CheckCircle2 style={{ width: 15, height: 15 }} />}>Mark complete</Button>
                    )}
                  </JobCard>
                ))}
              </div>
            </section>
          )}

          {/* Open jobs feed (only when online) */}
          <section style={{ marginBottom: 22 }}>
            <SectionTitle icon={Inbox} label={`Open requests (${visibleOpen.length})`} />
            {!online ? (
              <EmptyState text="You’re offline. Go online to see open job requests." />
            ) : visibleOpen.length === 0 ? (
              <EmptyState text="No open requests right now. New ones will appear here." />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {visibleOpen.map((job) => (
                  <JobCard key={job.id} job={job}>
                    <Button variant="ghost" size="sm" onClick={() => setHidden((h) => new Set(h).add(job.id))}>Dismiss</Button>
                    <Button variant="primary" size="sm" disabled={actioning === job.id} onClick={() => accept(job)}
                      iconLeft={actioning === job.id ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <CheckCircle2 style={{ width: 15, height: 15 }} />}>
                      Accept
                    </Button>
                  </JobCard>
                ))}
              </div>
            )}
          </section>

          {/* Past jobs */}
          {pastMine.length > 0 && (
            <section>
              <SectionTitle icon={Clock} label={`History (${pastMine.length})`} />
              <div style={{ display: 'grid', gap: 10 }}>
                {pastMine.map((job) => <JobCard key={job.id} job={job} muted showPatient />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ComponentType<{ style?: React.CSSProperties }>; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
      <Icon style={{ width: 16, height: 16, color: 'var(--teal)' }} />
      <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{label}</h2>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 22, textAlign: 'center', color: 'var(--muted)', fontSize: '0.86rem', border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-lg)' }}>{text}</div>;
}

function JobCard({ job, children, showPatient, muted }: { job: JobRow; children?: React.ReactNode; showPatient?: boolean; muted?: boolean }) {
  const service = job.service_metadata?.originalService || job.service_type.replace(/_/g, ' ').toLowerCase();
  const tone = job.status === 'COMPLETED' ? 'success' : job.status === 'IN_PROGRESS' ? 'teal' : job.status === 'EXPIRED' || job.status === 'CANCELLED' ? 'neutral' : 'teal';
  return (
    <div style={{ padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', opacity: muted ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink-teal)', textTransform: 'capitalize' }}>{service}</div>
          {job.reference_code && <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{job.reference_code}</div>}
        </div>
        {job.status !== 'PENDING' && <Badge tone={tone as 'success' | 'teal' | 'neutral'} size="sm">{STATUS_LABEL[job.status] || job.status}</Badge>}
      </div>
      <div style={{ display: 'grid', gap: 4, margin: '10px 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
        {job.pickup?.title && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin style={{ width: 13, height: 13 }} />{job.pickup.title}{job.pickup.pincode ? ` · ${job.pickup.pincode}` : ''}</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock style={{ width: 13, height: 13 }} />{job.booking_type === 'INSTANT' ? 'Same-day' : fmtWhen(job.scheduled_start_time)}</span>
        {showPatient && job.patient?.full_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 style={{ width: 13, height: 13 }} />Patient: {job.patient.full_name}</span>}
        {job.special_instructions && <span style={{ fontStyle: 'italic' }}>“{job.special_instructions}”</span>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{children}</div>}
    </div>
  );
}
