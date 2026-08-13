'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Input, Button, Badge } from '@caresy/ui';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Ban, Upload, FileCheck2,
  Loader2, LogIn, Power, MapPin, Briefcase, PlayCircle, Inbox, Smartphone, Car,
  Navigation, Phone,
} from 'lucide-react';
import { runningTotalPaise, formatINR, upiPayUrl } from '@caresy/utils/pricing';

// Companion portal — one page that branches on the signed-in user's companion
// record: register -> pending review -> approved (basic dashboard) / rejected
// (re-apply) / suspended. The nearby-jobs feed and accept/reject flow land in
// Phase 2 proper; this slice covers registration + KYC and the approval states
// so the admin approval queue can be tested end to end.

const LANGUAGE_OPTIONS = ['Hindi', 'English', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Urdu'];
const SPECIALTY_OPTIONS = ['Elderly care', 'Cardiology', 'Orthopedics', 'Oncology', 'Diagnostics', 'Post-surgery', 'Maternity', 'General'];
const DOC_TYPES = [
  { key: 'AADHAAR', label: 'Aadhaar card (front)', hint: 'Front side, clearly readable' },
  { key: 'AADHAAR_BACK', label: 'Aadhaar card (back)', hint: 'Back side, clearly readable' },
  // Optional at signup — can be added later before an admin approves.
  { key: 'POLICE_VERIFICATION', label: 'Police verification', hint: 'Certificate or acknowledgement', optional: true },
  { key: 'PHOTO_ID', label: 'Photo / selfie', hint: 'A recent clear headshot' },
  // Only needed for jobs where the companion drives the customer's own car or
  // bike. An admin sets companions.can_drive after checking this; the database
  // refuses the assignment until they do.
  { key: 'DRIVING_LICENCE', label: 'Driving licence', hint: 'Only if you want driving jobs. Front side, expiry visible.', optional: true },
] as const;

// Provider-agnostic by design: adding one is a line here, not a migration.
const RIDE_PROVIDERS = [
  { key: 'RAPIDO', label: 'Rapido' },
  { key: 'UBER', label: 'Uber' },
  { key: 'OLA', label: 'Ola' },
  { key: 'AUTO', label: 'Auto' },
  { key: 'LOCAL_TAXI', label: 'Local taxi' },
  { key: 'OTHER', label: 'Other' },
] as const;

const RIDE_PAYERS = [
  { key: 'CUSTOMER', label: 'Customer' },
  { key: 'FAMILY', label: 'Family' },
  { key: 'HOSPITAL', label: 'Hospital' },
] as const;

import type { ApprovalStatus } from '@caresy/types';
import LocationShare from '@/components/LocationShare';

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
  const [pendingDocs, setPendingDocs] = useState<string[]>([]);
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
    if (data) {
      // Which optional docs (police verification, driving licence) are not yet on file.
      const { data: docs } = await supabase
        .from('companion_documents')
        .select('doc_type')
        .eq('companion_id', user.id);
      const uploaded = new Set((docs ?? []).map((d) => d.doc_type as string));
      setPendingDocs(DOC_TYPES.filter((d) => 'optional' in d && !uploaded.has(d.key)).map((d) => d.label));
    }
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
          <Button variant="primary" iconLeft={<LogIn style={{ width: 16, height: 16 }} />} onClick={() => openLogin('/')}>
            Sign in to continue
          </Button>
        </div>
      </main>
    );
  }

  if (!companion) {
    return <RegistrationForm onDone={fetchCompanion} defaultName={profile?.full_name || (user.user_metadata?.full_name as string) || ''} defaultPhone={profile?.phone || ''} />;
  }

  if (companion.approval_status === 'PENDING_REVIEW') return <StatusCard kind="pending" name={companion.full_name} pendingDocs={pendingDocs} />;
  if (companion.approval_status === 'REJECTED') return <StatusCard kind="rejected" name={companion.full_name} reason={companion.rejection_reason} onReapply={fetchCompanion} />;
  if (companion.approval_status === 'SUSPENDED') return <StatusCard kind="suspended" name={companion.full_name} />;
  return <ApprovedDashboard companion={companion} onChange={fetchCompanion} pendingDocs={pendingDocs} />;
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

  const missingDocs = DOC_TYPES.filter((d) => !('optional' in d) && !files[d.key]).map((d) => d.label);

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
                    <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-teal)' }}>
                      {d.label}
                      {'optional' in d && <span style={{ fontWeight: 500, color: 'var(--muted)' }}> · Optional</span>}
                    </span>
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

// A gentle reminder that police verification / driving licence are still
// missing. These are optional at signup, so this never blocks — it just nudges.
function PendingDocsNote({ docs }: { docs: string[] }) {
  if (!docs.length) return null;
  return (
    <div style={{ margin: '0 0 18px', padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--teal-soft)', textAlign: 'left', fontSize: '0.82rem', color: 'var(--ink-teal)' }}>
      <strong>Still pending:</strong> {docs.join(', ')}. Optional to start — share on WhatsApp with ops when ready. Driving jobs need a verified licence.
    </div>
  );
}

function StatusCard({ kind, name, reason, onReapply, pendingDocs = [] }: { kind: 'pending' | 'rejected' | 'suspended'; name: string; reason?: string | null; onReapply?: () => void; pendingDocs?: string[] }) {
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
      {kind === 'pending' && <PendingDocsNote docs={pendingDocs} />}
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
  actual_start_time: string | null;
  created_at: string;
  special_instructions: string | null;
  // eveningSurchargePaise is the quote stored at booking time; complete_booking()
  // reads the same field back rather than recomputing, so the meter must too.
  // The two phone keys are not a mistake: /booking writes customerPhone and
  // /quick-help writes phone, and an urgent request is exactly the one where
  // the number has to be reachable.
  service_metadata: {
    originalService?: string;
    eveningSurchargePaise?: number | null;
    customerPhone?: string | null;
    phone?: string | null;
    customerName?: string | null;
    language?: string | null;
  } | null;
  companion_user_id: string | null;
  transport_mode: string | null;
  final_amount_paise: number | null;
  billed_minutes: number | null;
  payment_status: string;
  payment_method: string | null;
  pickup?: {
    title: string | null;
    address_line_1: string | null;
    pincode: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  patient?: { full_name: string | null; emergency_contact_phone: string | null } | null;
}

const JOB_SELECT =
  'id, reference_code, service_type, booking_type, status, scheduled_start_time, actual_start_time, created_at, special_instructions, service_metadata, companion_user_id, transport_mode, final_amount_paise, billed_minutes, payment_status, payment_method, pickup:locations!pickup_location_id (title, address_line_1, pincode, city, latitude, longitude), patient:patients!patient_id (full_name, emergency_contact_phone)';

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Flexible';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXPIRED: 'Expired', PENDING: 'Pending',
};

/**
 * What the visit has cost so far, ticking every 30 seconds.
 *
 * The customer sees the same number on their side. Nobody should discover the
 * price at the door — a Rs 299 quote settling at Rs 959 with no warning is the
 * argument this whole screen exists to avoid.
 */
/**
 * Turn-by-turn link for the pickup, or null when there is nothing to navigate to.
 *
 * Exact coordinates win when the customer shared them — a gate on a hospital
 * campus is a hundred metres from the pin a name search returns, which is the
 * whole point of the share button. Otherwise fall back to a text search over
 * whatever address parts exist.
 *
 * `maps.google.com/?api=1` rather than a `geo:` URI: geo: is unsupported on iOS
 * and dead on desktop, while this universal link opens the Google Maps app on
 * both phones and degrades to the browser everywhere else.
 */
function directionsUrl(p: JobRow['pickup']): string | null {
  if (!p) return null;
  if (p.latitude != null && p.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  }
  // Deduped: address_line_1 equals title on every booking made before the
  // meeting-point field existed, and "Max Hospital, Max Hospital" searches worse.
  const query = [...new Set([p.address_line_1, p.title, p.pincode, p.city].filter(Boolean))].join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

// The customer sees the same numbers from the same helper on my-bookings. This
// used to call priceForMinutes() directly and so omitted the evening surcharge,
// reading ₹99 under the real bill on every 6-8pm visit.
function RunningTotal({ startedAt, eveningSurchargePaise }: {
  startedAt: string | null;
  eveningSurchargePaise?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const running = runningTotalPaise(startedAt, new Date(now).toISOString(), eveningSurchargePaise);
  if (!running) return null;
  const hrs = Math.floor(running.minutes / 60);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
      <Clock style={{ width: 14, height: 14 }} />
      {hrs > 0 ? `${hrs}h ${running.minutes % 60}m` : `${running.minutes}m`} · {formatINR(running.paise)} so far
    </span>
  );
}

/**
 * Ride log. Caresy arranges the ride and never touches the money — the customer
 * pays the driver on the provider's own rails — so nothing here feeds the
 * Caresy bill. It is recorded for one reason: after a few hundred rides this is
 * a fare map of Noida that no third party will sell you.
 *
 * Deliberately not blocking. A companion helping someone out of a car should
 * not be stuck in a form, so every field is optional and this can be filled in
 * later from History.
 */
function RideLog({ job, onSaved }: { job: JobRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string>('RAPIDO');
  const [estimate, setEstimate] = useState('');
  const [finalFare, setFinalFare] = useState('');
  const [payer, setPayer] = useState<string>('CUSTOMER');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    let receiptPath: string | null = null;

    if (receipt) {
      // Folder is the booking id — the storage policy keys off it.
      const path = `${job.id}/${crypto.randomUUID()}-${receipt.name}`;
      const { error } = await supabase.storage.from('ride-receipts').upload(path, receipt);
      // A failed upload must not lose the fares, which are the valuable part.
      if (!error) receiptPath = path;
    }

    // Rupees in the box, paise in the column.
    const toPaise = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
    };

    let coords: Record<string, number> = {};
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
      coords = { drop_lat: pos.coords.latitude, drop_lng: pos.coords.longitude };
    } catch {
      // Hospital basements have no GPS. The fare still matters.
    }

    const { error } = await supabase.from('booking_transport').insert({
      booking_id: job.id,
      provider,
      estimated_fare_paise: toPaise(estimate),
      final_fare_paise: toPaise(finalFare),
      payer,
      receipt_path: receiptPath,
      drop_label: job.pickup?.title ?? null,
      ride_at: new Date().toISOString(),
      ...coords,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setOpen(false);
    setEstimate(''); setFinalFare(''); setReceipt(null);
    onSaved();
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} iconLeft={<Car style={{ width: 15, height: 15 }} />}>
        Log a ride
      </Button>
    );
  }

  const field: React.CSSProperties = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--line)', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit' };

  return (
    <div style={{ flexBasis: '100%', display: 'grid', gap: 10, marginTop: 4, padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <strong style={{ fontSize: '0.85rem', color: 'var(--ink-teal)' }}>Ride details</strong>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RIDE_PROVIDERS.map((p) => (
          <button key={p.key} type="button" onClick={() => setProvider(p.key)}
            style={{ padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
              border: provider === p.key ? '1px solid transparent' : '1px solid var(--line)',
              background: provider === p.key ? 'var(--teal)' : 'transparent',
              color: provider === p.key ? '#fff' : 'var(--muted)' }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.72rem', color: 'var(--muted)' }}>
          Quoted ₹
          <input style={field} inputMode="decimal" placeholder="280" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.72rem', color: 'var(--muted)' }}>
          Receipt ₹
          <input style={field} inputMode="decimal" placeholder="312" value={finalFare} onChange={(e) => setFinalFare(e.target.value)} />
        </label>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: -4 }}>
        Copy the receipt total exactly — do not estimate it.
      </span>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', alignSelf: 'center' }}>Paid by</span>
        {RIDE_PAYERS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPayer(p.key)}
            style={{ padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem',
              border: payer === p.key ? '1px solid transparent' : '1px solid var(--line)',
              background: payer === p.key ? 'var(--success-soft)' : 'transparent',
              color: payer === p.key ? '#1B7A54' : 'var(--muted)', fontWeight: payer === p.key ? 700 : 500 }}>
            {p.label}
          </button>
        ))}
      </div>

      <label style={{ display: 'grid', gap: 4, fontSize: '0.72rem', color: 'var(--muted)' }}>
        Receipt screenshot (optional)
        <input type="file" accept="image/*,application/pdf" style={{ fontSize: '0.75rem' }}
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" size="sm" disabled={saving} onClick={save}
          iconLeft={saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : undefined}>
          {saving ? 'Saving…' : 'Save ride'}
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
      </div>

      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
        You should never pay for a ride. The customer pays the driver directly.
      </span>
    </div>
  );
}

/**
 * The collect step. Amount comes from the server's final_amount_paise — never
 * recomputed here, or a stale client could show a number the database will not
 * agree with.
 */
function CollectPanel({ job, busy, onCollect }: {
  job: JobRow; busy: boolean; onCollect: (m: 'CASH' | 'UPI') => void;
}) {
  const paise = job.final_amount_paise ?? 0;
  const vpa = process.env.NEXT_PUBLIC_UPI_VPA;
  const upiUrl = vpa
    ? upiPayUrl({ vpa, name: 'Caresy', paise, ref: job.reference_code || job.id.slice(0, 8) })
    : null;

  return (
    <div style={{ flexBasis: '100%', display: 'grid', gap: 10, marginTop: 4, padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--success-soft)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          Collect{job.billed_minutes != null ? ` · ${job.billed_minutes} min` : ''}
        </span>
        <strong style={{ fontSize: '1.35rem', color: 'var(--ink-teal)' }}>{formatINR(paise)}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {upiUrl && (
          // Android hands upi:// to the OS, which offers every installed UPI
          // app. iOS has no generic handler — hence the copyable VPA below.
          <a href={upiUrl} style={{ flex: 1, minWidth: 130, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 999, background: 'var(--teal)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
            <Smartphone style={{ width: 15, height: 15 }} /> Open UPI app
          </a>
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onCollect('UPI')}>UPI received</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onCollect('CASH')}>Cash received</Button>
      </div>
      {vpa ? (
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Or ask them to pay {vpa} — then tap UPI received.</span>
      ) : (
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>UPI link unavailable — NEXT_PUBLIC_UPI_VPA is not configured.</span>
      )}
    </div>
  );
}

function ApprovedDashboard({ companion, onChange, pendingDocs = [] }: { companion: CompanionRow; onChange: () => void; pendingDocs?: string[] }) {
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

  // Completion goes through the RPC, not a status update: the server reads the
  // clock and prices the visit itself. A client-sent amount would be a number
  // the person collecting the money chose.
  const completeJob = async (job: JobRow) => {
    setActioning(job.id);
    const { error } = await createClient().rpc('complete_booking', { p_booking: job.id });
    setActioning(null);
    if (error) { alert(error.message); return; }
    await fetchJobs();
  };

  const collect = async (job: JobRow, method: 'CASH' | 'UPI') => {
    setActioning(job.id);
    const { error } = await createClient().rpc('record_payment', { p_booking: job.id, p_method: method });
    setActioning(null);
    if (error) { alert(error.message); return; }
    await fetchJobs();
  };

  // A completed job with money still owed stays in the active list — the
  // companion is standing there and must not have to hunt through History for
  // the collect button.
  const activeMine = myJobs.filter((j) =>
    ['ACCEPTED', 'IN_PROGRESS'].includes(j.status) || j.payment_status === 'PENDING');
  const pastMine = myJobs.filter((j) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(j.status) && j.payment_status !== 'PENDING');
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

      <PendingDocsNote docs={pendingDocs} />

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
                    <LocationShare bookingId={job.id} />
                    {job.status === 'ACCEPTED' && (
                      <Button variant="primary" size="sm" disabled={actioning === job.id} onClick={() => setJobStatus(job, 'IN_PROGRESS', { actual_start_time: new Date().toISOString() })}
                        iconLeft={<PlayCircle style={{ width: 15, height: 15 }} />}>Start job</Button>
                    )}
                    {job.status === 'IN_PROGRESS' && (
                      <>
                        <RunningTotal startedAt={job.actual_start_time}
                          eveningSurchargePaise={job.service_metadata?.eveningSurchargePaise ?? 0} />
                        <RideLog job={job} onSaved={fetchJobs} />
                        <Button variant="primary" size="sm" disabled={actioning === job.id} onClick={() => completeJob(job)}
                          iconLeft={<CheckCircle2 style={{ width: 15, height: 15 }} />}>Complete &amp; bill</Button>
                      </>
                    )}
                    {job.payment_status === 'PENDING' && (
                      <CollectPanel job={job} busy={actioning === job.id} onCollect={(m) => collect(job, m)} />
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

/**
 * Who to call, as tappable numbers.
 *
 * Both booking flows already stored the customer's mobile — /booking under
 * `customerPhone`, /quick-help under `phone` — and neither was ever rendered
 * here. The emergency contact is the fallback when the person who booked is not
 * the person at the hospital, which on an elderly-care visit is usual.
 */
function ContactRow({ job }: { job: JobRow }) {
  const meta = job.service_metadata;
  const numbers: { label: string; value: string }[] = [];
  const customer = meta?.customerPhone || meta?.phone;
  if (customer) numbers.push({ label: meta?.customerName || 'Customer', value: customer });
  if (job.patient?.emergency_contact_phone && job.patient.emergency_contact_phone !== customer) {
    numbers.push({ label: 'Emergency', value: job.patient.emergency_contact_phone });
  }
  if (numbers.length === 0) return null;

  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
      {numbers.map((n) => (
        <a key={n.value} href={`tel:${n.value}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'var(--teal-soft)', color: 'var(--teal-deep, #08796f)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
          <Phone style={{ width: 12, height: 12 }} />
          {n.label} · {n.value}
        </a>
      ))}
    </span>
  );
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
        {/* The database refuses this job to anyone without a verified licence,
            and used to say so only as an alert() after tapping Accept. */}
        {job.transport_mode === 'CUSTOMER_VEHICLE' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--terracotta-deep, #9a4a33)', fontWeight: 700 }}>
            <Car style={{ width: 13, height: 13 }} />
            You drive the customer&rsquo;s vehicle — needs a verified licence
          </span>
        )}
        {job.transport_mode === 'COMPANION_ARRANGED' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Car style={{ width: 13, height: 13 }} />
            You book the cab; the customer pays the driver
          </span>
        )}
        {/* The meeting point the customer typed. Only when it differs from the
            hospital name — both booking flows wrote the hospital into
            address_line_1 before this field existed, so old rows would echo. */}
        {job.pickup?.address_line_1 && job.pickup.address_line_1 !== job.pickup.title && (
          <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
            <Navigation style={{ width: 13, height: 13, flexShrink: 0, marginTop: 2 }} />
            {job.pickup.address_line_1}
          </span>
        )}
        {directionsUrl(job.pickup) && (
          <a href={directionsUrl(job.pickup)!} target="_blank" rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--teal-deep, #08796f)', fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}>
            <Navigation style={{ width: 13, height: 13 }} />
            {job.pickup?.latitude != null ? 'Directions to exact spot' : 'Directions'}
          </a>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock style={{ width: 13, height: 13 }} />{job.booking_type === 'INSTANT' ? 'Same-day' : fmtWhen(job.scheduled_start_time)}</span>
        {showPatient && job.patient?.full_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 style={{ width: 13, height: 13 }} />Patient: {job.patient.full_name}</span>}
        {/* Only on jobs this companion holds — patient PII stays off the open
            feed. Until now the number was in the row and simply never drawn, so
            a companion standing at the gate had no way to call the family. */}
        {showPatient && <ContactRow job={job} />}
        {job.special_instructions && <span style={{ fontStyle: 'italic' }}>“{job.special_instructions}”</span>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{children}</div>}
    </div>
  );
}
