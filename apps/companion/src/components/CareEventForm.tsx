'use client';

import React, { useState } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Input } from '@caresy/ui';
import { ClipboardPlus, Loader2 } from 'lucide-react';

const KINDS = ['NOTE', 'VITALS', 'MEDICATION', 'VISIT'] as const;

export default function CareEventForm({ bookingId, patientId, onCreated }: { bookingId: string; patientId: string | null; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>('NOTE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!patientId) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('care_events').insert({
      patient_id: patientId,
      booking_id: bookingId,
      kind,
      title: title.trim(),
      body: body.trim() || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTitle(''); setBody('');
    setOpen(false);
    onCreated?.();
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} iconLeft={<ClipboardPlus style={{ width: 14, height: 14 }} />}>
        Log care note
      </Button>
    );
  }

  return (
    <form onSubmit={submit} style={{ flexBasis: '100%', display: 'grid', gap: 8, padding: 12, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <strong style={{ fontSize: '0.85rem', color: 'var(--ink-teal)' }}>Care log — visible to family circle</strong>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {KINDS.map(k => (
          <button key={k} type="button" onClick={() => setKind(k)} style={{ padding: '6px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, border: kind===k?'1px solid transparent':'1px solid var(--line)', background: kind===k?'var(--teal)':'transparent', color: kind===k?'#fff':'var(--muted)', cursor: 'pointer' }}>{k}</button>
        ))}
      </div>
      <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Medication given" required />
      <Input label="Details" value={body} onChange={e => setBody(e.target.value)} placeholder="Notes for the family" multiline rows={3} />
      {error && <span style={{ fontSize: '0.72rem', color: 'var(--danger, #b3261e)' }}>{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" size="sm" disabled={saving} iconLeft={saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : undefined}>{saving ? 'Saving…' : 'Save note'}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Fires CARE_EVENT_{kind} → customer circle (23_CARE).</span>
    </form>
  );
}
