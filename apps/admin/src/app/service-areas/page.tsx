'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Button, Input, Badge } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels, useToast } from '@/components/AdminShell';
import { Loader2, Plus, Trash2, MapPin } from 'lucide-react';
import { isValidPincode } from '@caresy/utils';

// Admin editor for the pincode allowlist that decides service coverage. Ops can
// add/remove/toggle pincodes here — no deploy needed. Backs both the
// LocationBadge check and the booking guard. Toggle/remove are optimistic
// (instant, reverted on error); add appends the inserted row directly instead
// of refetching the whole list.

interface AreaRow {
  id: string;
  pincode: string;
  area_name: string | null;
  city: string;
  is_active: boolean;
}

export default function AdminServiceAreas() {
  return (
    <AdminShell title="Service areas" subtitle="Pincodes Caresy serves. Bookings outside this list are rejected automatically." maxWidth={720}>
      <AdminGuard purpose="manage service areas">
        <AreasBody />
      </AdminGuard>
    </AdminShell>
  );
}

function AreasBody() {
  const supabase = useMemo(() => createClient(), []);
  const { show, node: toastNode } = useToast();
  const [rows, setRows] = useState<AreaRow[] | null>(null);
  const [pincode, setPincode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [city, setCity] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('service_areas').select('*').order('pincode');
      if (alive) setRows((data as AreaRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPincode(pincode)) { setError('Enter a valid 6-digit pincode.'); return; }
    setAdding(true);
    const { data, error: err } = await supabase.from('service_areas').insert({
      pincode: pincode.trim(), area_name: areaName.trim() || null, city: city.trim() || 'Noida',
    }).select().single();
    setAdding(false);
    if (err) { setError(err.message.includes('duplicate') ? 'That pincode is already in the list.' : err.message); return; }
    setRows((cur) => [...(cur ?? []), data as AreaRow].sort((a, b) => a.pincode.localeCompare(b.pincode)));
    setPincode(''); setAreaName(''); setCity('');
    show(`Pincode ${(data as AreaRow).pincode} added.`);
  };

  const toggleActive = async (row: AreaRow) => {
    const snapshot = rows;
    setRows((cur) => (cur ?? []).map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
    const { error: err } = await supabase.from('service_areas').update({ is_active: !row.is_active }).eq('id', row.id);
    if (err) { setRows(snapshot); show(err.message, 'err'); }
  };

  const remove = async (row: AreaRow) => {
    if (!confirm(`Remove pincode ${row.pincode}?`)) return;
    const snapshot = rows;
    setRows((cur) => (cur ?? []).filter((r) => r.id !== row.id));
    const { error: err } = await supabase.from('service_areas').delete().eq('id', row.id);
    if (err) { setRows(snapshot); show(err.message, 'err'); }
    else show(`Pincode ${row.pincode} removed.`);
  };

  const activeCount = (rows ?? []).filter((r) => r.is_active).length;

  return (
    <>
      <form onSubmit={add} className="adm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10, marginBottom: 10 }}>
          <Input placeholder="Pincode *" inputMode="numeric" maxLength={6} value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} />
          <Input placeholder="Area name" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        {error && <p className="adm-error">{error}</p>}
        <Button type="submit" variant="primary" size="sm" disabled={adding}
          iconLeft={adding ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}>
          Add pincode
        </Button>
      </form>

      {rows !== null && rows.length > 0 && (
        <p className="adm-hint" style={{ display: 'block', marginBottom: 12 }}>
          {activeCount} of {rows.length} pincode{rows.length === 1 ? '' : 's'} active.
        </p>
      )}

      {rows === null ? (
        <Skels n={4} h={64} />
      ) : rows.length === 0 ? (
        <div className="adm-empty">No service areas yet — add your first pincode above.</div>
      ) : (
        <div className="adm-list" style={{ gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} className="adm-card adm-row" style={{ padding: '12px 14px', opacity: r.is_active ? 1 : 0.55 }}>
              <span className="adm-doc-ico"><MapPin style={{ width: 16, height: 16 }} /></span>
              <div className="adm-row-main">
                <div className="adm-name-row">
                  <strong>{r.pincode}</strong>
                  {r.is_active ? <Badge tone="success" size="sm">active</Badge> : <Badge tone="neutral" size="sm">inactive</Badge>}
                </div>
                <div className="adm-meta">{[r.area_name, r.city].filter(Boolean).join(' · ')}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>{r.is_active ? 'Disable' : 'Enable'}</Button>
              <button onClick={() => remove(r)} aria-label="Remove" className="adm-signout" style={{ color: 'var(--terracotta)' }}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
        </div>
      )}
      {toastNode}
    </>
  );
}
