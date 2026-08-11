'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, MotionSpot } from '@caresy/ui';
import {
  Loader2, ArrowLeft, Plus, FileText, Users, HeartPulse, Share2,
  Download, Trash2, ChevronRight, ShieldCheck,
} from 'lucide-react';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

// Query params rather than a dynamic segment: this repo has no [param] route yet
// and runs a Next version whose conventions I would be guessing at. The tracking
// page already proves useSearchParams + Suspense works here.
//   /care                → the patients you can see
//   /care?id=<uuid>      → one patient's dashboard
//   /care?join=<token>   → redeem a family invite, then land on that dashboard

interface Patient {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  blood_group: string | null;
  allergies: string | null;
  conditions: string | null;
  medications: string | null;
  care_notes: string | null;
  mobility_notes: string | null;
  primary_doctor: string | null;
  emergency_contact_phone: string | null;
  invite_token: string;
  customer_user_id: string;
}

interface CareEvent {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  occurred_at: string;
}

interface PatientDoc {
  id: string;
  doc_type: string;
  title: string | null;
  file_path: string;
  uploaded_at: string;
}

interface Member {
  id: string;
  user_id: string;
  relation: string | null;
}

const DOC_TYPES = ['PRESCRIPTION', 'REPORT', 'RECEIPT', 'OTHER'] as const;

const KIND_STYLE: Record<string, { dot: string; label: string }> = {
  VISIT: { dot: 'var(--m3-green)', label: 'Visit' },
  MEDICATION: { dot: 'var(--m3-amber)', label: 'Medication' },
  VITALS: { dot: 'var(--m3-cyan)', label: 'Vitals' },
  DOCUMENT: { dot: 'var(--m3-muted)', label: 'Document' },
  STATUS: { dot: 'var(--m3-muted)', label: 'Update' },
  NOTE: { dot: 'var(--m3-green-deep)', label: 'Note' },
};

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Spinner() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '80px 24px' }}>
      <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: 'var(--m3-green)' }} />
    </div>
  );
}

function Section({ icon: Icon, title, action, children }: { icon: React.ElementType; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--m3-ink)' }}>
          <Icon style={{ width: 17, height: 17, color: 'var(--m3-green)' }} />{title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Care Passport
// ---------------------------------------------------------------------------
const PASSPORT_FIELDS: { key: keyof Patient; label: string; long?: boolean }[] = [
  { key: 'blood_group', label: 'Blood group' },
  { key: 'primary_doctor', label: 'Primary doctor' },
  { key: 'emergency_contact_phone', label: 'Emergency contact' },
  { key: 'allergies', label: 'Allergies', long: true },
  { key: 'conditions', label: 'Conditions', long: true },
  { key: 'medications', label: 'Medications', long: true },
  { key: 'mobility_notes', label: 'Mobility', long: true },
  { key: 'care_notes', label: 'Other notes', long: true },
];

function Passport({ patient, canEdit, onSaved }: { patient: Patient; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(Object.fromEntries(PASSPORT_FIELDS.map((f) => [f.key, patient[f.key] ?? ''])));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    // Empty string is the user clearing a field; store NULL rather than ''.
    const payload = Object.fromEntries(
      PASSPORT_FIELDS.map((f) => [f.key, ((draft[f.key] as string) || '').trim() || null]),
    );
    const { error: err } = await createClient().from('patients').update(payload).eq('id', patient.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <Section icon={ShieldCheck} title="Care Passport">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PASSPORT_FIELDS.map((f) => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m3-muted)' }}>{f.label}</span>
              {f.long ? (
                <textarea
                  value={(draft[f.key] as string) ?? ''}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  rows={2}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
                />
              ) : (
                <input
                  value={(draft[f.key] as string) ?? ''}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 14 }}
                />
              )}
            </label>
          ))}
          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta-deep, #a33)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      </Section>
    );
  }

  const filled = PASSPORT_FIELDS.filter((f) => patient[f.key]);

  return (
    <Section
      icon={ShieldCheck}
      title="Care Passport"
      action={canEdit ? <button onClick={start} style={{ border: 'none', background: 'transparent', color: 'var(--m3-green-deep)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button> : null}
    >
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
        What a companion should know before the visit. Shared with the assigned companion only.
      </p>
      {filled.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--m3-muted)' }}>
          Nothing recorded yet.{canEdit ? ' Add allergies, conditions and current medicines so a companion never has to guess.' : ''}
        </p>
      ) : (
        <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
          {filled.map((f) => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <dt style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>{f.label}</dt>
              <dd style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--m3-ink)', whiteSpace: 'pre-wrap' }}>{patient[f.key] as string}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
function Timeline({ patientId, events, onAdded }: { patientId: string; events: CareEvent[]; onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('NOTE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!title.trim()) { setError('Give the entry a title.'); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('care_events').insert({
      patient_id: patientId, kind, title: title.trim(), body: body.trim() || null, created_by: user?.id ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setTitle(''); setBody(''); setKind('NOTE'); setAdding(false);
    onAdded();
  };

  return (
    <Section
      icon={HeartPulse}
      title="Care timeline"
      action={
        <button onClick={() => setAdding(!adding)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: 'var(--m3-green-deep)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus style={{ width: 15, height: 15 }} />Add
        </button>
      }
    >
      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--m3-chip)' }}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 14, background: '#fff' }}>
            {Object.entries(KIND_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 14 }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Details (optional)" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} />
          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta-deep, #a33)' }}>{error}</p>}
          <Button variant="primary" size="sm" onClick={add} disabled={saving}>{saving ? 'Saving…' : 'Add to timeline'}</Button>
        </div>
      )}

      {events.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--m3-muted)' }}>
          Nothing yet. Visits, medicine changes and companion notes will appear here in order.
        </p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: '0 0 0 20px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span aria-hidden style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: 'var(--m3-line)' }} />
          {events.map((e) => {
            const s = KIND_STYLE[e.kind] || KIND_STYLE.NOTE;
            return (
              <li key={e.id} style={{ position: 'relative' }}>
                <span aria-hidden style={{ position: 'absolute', left: -20, top: 5, width: 9, height: 9, borderRadius: '50%', background: s.dot, boxShadow: '0 0 0 3px var(--m3-surface)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--m3-ink)' }}>{e.title}</strong>
                  <span style={{ fontSize: 11, color: 'var(--m3-muted)', flexShrink: 0 }}>{s.label}</span>
                </div>
                {e.body && <p style={{ margin: '3px 0 0', fontSize: 13.5, lineHeight: '19px', color: 'var(--m3-muted)', whiteSpace: 'pre-wrap' }}>{e.body}</p>}
                <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: 'var(--m3-muted)' }}>{fmt(e.occurred_at)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
function Documents({ patientId, docs, onChanged }: { patientId: string; docs: PatientDoc[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<string>('PRESCRIPTION');
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Folder is the patient id — the storage policy keys the whole circle's
    // access off it, so a document uploaded by one relative is readable by all.
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${patientId}/${crypto.randomUUID()}-${safe}`;

    const { error: upErr } = await supabase.storage.from('patient-docs').upload(path, file);
    if (upErr) { setBusy(false); setError(upErr.message); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: rowErr } = await supabase.from('patient_documents').insert({
      patient_id: patientId, doc_type: docType, title: file.name, file_path: path, uploaded_by: user?.id ?? null,
    });
    setBusy(false);
    if (rowErr) { setError(rowErr.message); return; }
    onChanged();
  };

  // Private bucket, so a plain URL will not open. Mint a short-lived signed one.
  const open = async (doc: PatientDoc) => {
    const { data, error: err } = await createClient().storage.from('patient-docs').createSignedUrl(doc.file_path, 60);
    if (err || !data?.signedUrl) { setError(err?.message || 'Could not open the file.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const remove = async (doc: PatientDoc) => {
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from('patient-docs').remove([doc.file_path]);
    await supabase.from('patient_documents').delete().eq('id', doc.id);
    setBusy(false);
    onChanged();
  };

  return (
    <Section icon={FileText} title="Documents">
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
        Prescriptions, reports and receipts. Stored privately; only this patient&rsquo;s circle can open them.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--m3-line)', fontFamily: 'inherit', fontSize: 13, background: '#fff' }}>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
          <Plus style={{ width: 15, height: 15 }} />
          {busy ? 'Working…' : 'Upload'}
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta-deep, #a33)' }}>{error}</p>}

      {docs.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--m3-muted)' }}>No documents yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((d) => (
            <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--m3-chip)' }}>
              <FileText style={{ width: 17, height: 17, color: 'var(--m3-green)', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--m3-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.file_path.split('/').pop()}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--m3-muted)' }}>{d.doc_type.toLowerCase()} · {fmt(d.uploaded_at)}</span>
              </span>
              <button onClick={() => open(d)} aria-label="Open document" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-green-deep)', padding: 4 }}>
                <Download style={{ width: 17, height: 17 }} />
              </button>
              <button onClick={() => remove(d)} aria-label="Delete document" disabled={busy} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-muted)', padding: 4 }}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Family circle
// ---------------------------------------------------------------------------
function Circle({ patient, members, isOwner }: { patient: Patient; members: Member[]; isOwner: boolean }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/care?join=${patient.invite_token}`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Follow ${patient.full_name}'s care on Caresy`, url: inviteUrl }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Section icon={Users} title="Family circle">
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
        {members.length === 0
          ? 'Only you can see this patient right now.'
          : `${members.length} ${members.length === 1 ? 'person has' : 'people have'} been added alongside you.`}
      </p>

      {members.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map((m) => (
            <li key={m.id} style={{ fontSize: 13.5, color: 'var(--m3-ink)' }}>
              {m.relation || 'Family member'}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <>
          <Button variant="outline" size="sm" onClick={share} iconLeft={<Share2 style={{ width: 15, height: 15 }} />}>
            {copied ? 'Link copied' : 'Invite family'}
          </Button>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
            Anyone with this link can see the timeline, passport and documents. Send it only to family.
          </p>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function CareInner() {
  const params = useSearchParams();
  const patientId = params.get('id');
  const joinToken = params.get('join');
  const { user, isLoading: authLoading, openLogin } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [docs, setDocs] = useState<PatientDoc[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (authLoading || !user) return;

    let alive = true;
    const supabase = createClient();

    (async () => {
      setError(null);

      // Redeeming an invite happens before anything is read — the joiner cannot
      // see the patient until the membership row exists.
      let targetId = patientId;
      if (joinToken) {
        const { data, error: joinErr } = await supabase.rpc('join_patient_circle', { p_token: joinToken });
        if (joinErr) { if (alive) { setError(joinErr.message); setLoading(false); } return; }
        targetId = data as string;
      }

      if (!targetId) {
        const { data, error: err } = await supabase
          .from('patients')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (!alive) return;
        if (err) setError(err.message);
        setPatients((data as Patient[]) ?? []);
        setPatient(null);
        setLoading(false);
        return;
      }

      const [p, e, d, m] = await Promise.all([
        supabase.from('patients').select('*').eq('id', targetId).maybeSingle(),
        supabase.from('care_events').select('id, kind, title, body, occurred_at').eq('patient_id', targetId).order('occurred_at', { ascending: false }),
        supabase.from('patient_documents').select('id, doc_type, title, file_path, uploaded_at').eq('patient_id', targetId).order('uploaded_at', { ascending: false }),
        supabase.from('patient_members').select('id, user_id, relation').eq('patient_id', targetId),
      ]);

      if (!alive) return;
      if (p.error) setError(p.error.message);
      setPatient((p.data as Patient) ?? null);
      setEvents((e.data as CareEvent[]) ?? []);
      setDocs((d.data as PatientDoc[]) ?? []);
      setMembers((m.data as Member[]) ?? []);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [user, authLoading, patientId, joinToken, reloadKey]);

  if (authLoading) return <Spinner />;

  // Guests are checked before `loading`, which stays true for them because the
  // fetch effect never runs — no setState-in-effect just to settle a spinner.
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><MotionSpot variant="welcome" size={132} /></div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--m3-ink)' }}>Care lives here</h2>
        <p style={{ margin: '0 auto 20px', maxWidth: 360, fontSize: 14, lineHeight: '20px', color: 'var(--m3-muted)' }}>
          Sign in to follow a family member&rsquo;s visits, medicines and reports in one timeline — and to share it with the rest of the family.
        </p>
        <Button variant="primary" onClick={() => openLogin(joinToken ? `/care?join=${joinToken}` : '/care')}>Sign In</Button>
      </div>
    );
  }

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--m3-ink)' }}>That didn&rsquo;t work</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--m3-muted)' }}>{error}</p>
        <Link href="/care" style={{ fontSize: 14, fontWeight: 700, color: 'var(--m3-green-deep)' }}>Back to care</Link>
      </div>
    );
  }

  // ---- List ----
  if (!patient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, lineHeight: '32px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Care</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--m3-muted)' }}>
            Everyone you look after, and everything recorded about their care.
          </p>
        </div>

        {patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><MotionSpot variant="clipboard" size={120} /></div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--m3-ink)' }}>No patients yet</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: '20px', color: 'var(--m3-muted)' }}>
              A patient record is created with your first booking. After that, their timeline, documents and care passport live here.
            </p>
            <Link href="/booking" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Book a companion</Link>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {patients.map((p) => (
              <li key={p.id}>
                <Link href={`/care?id=${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', textDecoration: 'none' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                    {p.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: 'var(--m3-ink)' }}>{p.full_name}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--m3-muted)' }}>
                      {[p.age ? `${p.age} yrs` : null, p.gender, p.blood_group].filter(Boolean).join(' · ') || 'Tap to add care details'}
                    </span>
                  </span>
                  <ChevronRight style={{ width: 17, height: 17, color: 'var(--m3-muted)', flexShrink: 0 }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---- One patient ----
  const isOwner = patient.customer_user_id === user.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/care" aria-label="Back to all patients" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', color: 'var(--m3-ink)' }}>
          <ArrowLeft style={{ width: 19, height: 19 }} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>{patient.full_name}</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--m3-muted)' }}>
            {[patient.age ? `${patient.age} yrs` : null, patient.gender].filter(Boolean).join(' · ') || 'Care record'}
          </p>
        </div>
      </div>

      <Timeline patientId={patient.id} events={events} onAdded={reload} />
      <Passport patient={patient} canEdit={isOwner} onSaved={reload} />
      <Documents patientId={patient.id} docs={docs} onChanged={reload} />
      <Circle patient={patient} members={members} isOwner={isOwner} />
    </div>
  );
}

export default function CarePage() {
  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto', padding: 16 }}>
        <Suspense fallback={<Spinner />}>
          <CareInner />
        </Suspense>
      </div>
    </main>
  );
}
