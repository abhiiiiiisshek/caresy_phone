'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Input } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels, useToast } from '@/components/AdminShell';
import { Loader2 } from 'lucide-react';

// Timeout settings editor — small CRUD over app_settings (migration 13), which
// already has admin-only RLS. Saves update the local baseline directly instead
// of refetching, so the Save button settles instantly.

interface SettingRow { key: string; value: string; label: string | null }

export default function AdminSettings() {
  return (
    <AdminShell title="Settings" subtitle="Timeouts that control the request lifecycle expiry sweep (runs every 5 min via pg_cron)." maxWidth={640}>
      <AdminGuard purpose="manage settings">
        <SettingsBody />
      </AdminGuard>
    </AdminShell>
  );
}

function SettingsBody() {
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();
  const [rows, setRows] = useState<SettingRow[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('app_settings').select('key, value, label').order('key');
      if (!alive) return;
      const list = (data as SettingRow[]) ?? [];
      setRows(list);
      setEdits(Object.fromEntries(list.map((r) => [r.key, r.value])));
    })();
    return () => { alive = false; };
  }, [supabase]);

  const save = async (key: string) => {
    setSaving(key);
    const { error } = await supabase.from('app_settings').update({ value: edits[key] }).eq('key', key);
    setSaving(null);
    if (error) { show(error.message, 'err'); return; }
    // Move the baseline locally so the button flips back to disabled/"Saved".
    setRows((cur) => (cur ?? []).map((r) => (r.key === key ? { ...r, value: edits[key] } : r)));
    show('Saved.');
  };

  return (
    <>
      {rows === null ? (
        <Skels n={2} h={86} />
      ) : rows.length === 0 ? (
        <div className="adm-empty">No settings found.</div>
      ) : (
        <div className="adm-list">
          {rows.map((r) => (
            <div key={r.key} className="adm-card" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={r.label || r.key}
                  type="number"
                  min={1}
                  value={edits[r.key] ?? ''}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [r.key]: e.target.value }))}
                />
              </div>
              <Button variant="primary" size="sm" disabled={saving === r.key || edits[r.key] === r.value} onClick={() => save(r.key)}
                iconLeft={saving === r.key ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : undefined}>
                {saving === r.key ? 'Saving…' : edits[r.key] === r.value ? 'Saved' : 'Save'}
              </Button>
            </div>
          ))}
        </div>
      )}
      {toastNode}
    </>
  );
}
