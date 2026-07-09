'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Button, Input, Badge } from '@/components/ds';
import { AdminNav } from '@/components/AdminNav';
import { Loader2, ShieldCheck, Plus, Trash2, MapPin } from 'lucide-react';
import { isValidPincode } from '@/utils/serviceArea';

// Admin editor for the pincode allowlist that decides service coverage. Ops
// can add/remove/toggle pincodes here — no deploy needed. Backs both the
// LocationBadge check and the booking guard.

interface AreaRow {
  id: string;
  pincode: string;
  area_name: string | null;
  city: string;
  is_active: boolean;
}

export default function AdminServiceAreas() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [city, setCity] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('service_areas').select('*').order('pincode');
    setRows((data as AreaRow[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPincode(pincode)) { setError('Enter a valid 6-digit pincode.'); return; }
    setAdding(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('service_areas').insert({
      pincode: pincode.trim(), area_name: areaName.trim() || null, city: city.trim() || 'Noida',
    });
    setAdding(false);
    if (err) { setError(err.message.includes('duplicate') ? 'That pincode is already in the list.' : err.message); return; }
    setPincode(''); setAreaName(''); setCity('');
    fetchRows();
  };

  const toggleActive = async (row: AreaRow) => {
    const supabase = createClient();
    await supabase.from('service_areas').update({ is_active: !row.is_active }).eq('id', row.id);
    fetchRows();
  };

  const remove = async (row: AreaRow) => {
    if (!confirm(`Remove pincode ${row.pincode}?`)) return;
    const supabase = createClient();
    await supabase.from('service_areas').delete().eq('id', row.id);
    fetchRows();
  };

  if (isLoading) {
    return <main className="app-shell-page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main className="app-shell-page" style={{ maxWidth: 520, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to manage service areas.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/service-areas')}>Sign in</Button>}
      </main>
    );
  }

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <main className="app-shell-page" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Service areas</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Pincodes Caresy serves. {activeCount} active. Bookings outside this list are rejected automatically.
      </p>

      {/* Add form */}
      <form onSubmit={add} style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10, marginBottom: 10 }}>
          <Input placeholder="Pincode *" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} />
          <Input placeholder="Area name" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        {error && <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--terracotta)', fontWeight: 600 }}>{error}</p>}
        <Button type="submit" variant="primary" size="sm" disabled={adding}
          iconLeft={adding ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}>
          Add pincode
        </Button>
      </form>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)', opacity: r.is_active ? 1 : 0.55 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 9, background: 'var(--teal-soft)', color: 'var(--teal)', flexShrink: 0 }}><MapPin style={{ width: 16, height: 16 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: 'var(--ink-teal)' }}>{r.pincode}</strong>
                  {r.is_active ? <Badge tone="success" size="sm">active</Badge> : <Badge tone="neutral" size="sm">inactive</Badge>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{[r.area_name, r.city].filter(Boolean).join(' · ')}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>{r.is_active ? 'Disable' : 'Enable'}</Button>
              <button onClick={() => remove(r)} aria-label="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--terracotta)', display: 'inline-flex', padding: 6 }}><Trash2 style={{ width: 16, height: 16 }} /></button>
            </div>
          ))}
          {rows.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No service areas yet — add your first pincode above.</div>}
        </div>
      )}
    </main>
  );
}
