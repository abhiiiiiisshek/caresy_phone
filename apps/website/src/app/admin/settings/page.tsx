'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Input } from '@caresy/ui';
import { AdminNav } from '@/components/AdminNav';
import { Loader2, ShieldCheck } from 'lucide-react';

// Timeout settings editor (DEVELOPER_HANDOFF.md §6-C) — small CRUD over
// app_settings (migration 13), which already has admin-only RLS.

interface SettingRow { key: string; value: string; label: string | null }

export default function AdminSettings() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('app_settings').select('key, value, label').order('key');
    const list = (data as SettingRow[]) ?? [];
    setRows(list);
    setEdits(Object.fromEntries(list.map((r) => [r.key, r.value])));
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const save = async (key: string) => {
    setSaving(key);
    const supabase = createClient();
    const { error } = await supabase.from('app_settings').update({ value: edits[key] }).eq('key', key);
    setSaving(null);
    if (error) { showToast(error.message); return; }
    showToast('Saved.');
    fetchRows();
  };

  if (isLoading) {
    return <main style={{ minHeight: '60vh', paddingTop: 118, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '138px 20px 48px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to manage settings.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/settings')}>Sign in</Button>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '118px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Settings</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Timeouts that control the request lifecycle expiry sweep (runs every 5 min via pg_cron).
      </p>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <Input
                label={r.label || r.key}
                type="number"
                min={1}
                value={edits[r.key] ?? ''}
                onChange={(e) => setEdits((prev) => ({ ...prev, [r.key]: e.target.value }))}
                style={{ flex: 1 }}
              />
              <Button variant="primary" size="sm" disabled={saving === r.key || edits[r.key] === r.value} onClick={() => save(r.key)}>
                {saving === r.key ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ))}
          {rows.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No settings found.</div>}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '12px 20px', borderRadius: 999, background: 'var(--ink-teal)', color: '#fff', fontSize: '0.86rem', fontWeight: 600 }}>{toast}</div>
      )}
    </main>
  );
}
