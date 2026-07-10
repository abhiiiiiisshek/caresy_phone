'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Button, Badge, Input } from '@/components/ds';
import { AdminNav } from '@/components/AdminNav';
import { Loader2, ShieldCheck, Mail, Phone } from 'lucide-react';

// Customer directory (DEVELOPER_HANDOFF.md §6-C). Reads via the admin_list_users()
// RPC (migration 15) since profiles has no email column — email lives in
// auth.users, which anon/authenticated can't read directly.

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  age: number | null;
  phone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  booking_count: number;
}

export default function AdminUsers() {
  const { user, isAdmin, isLoading, openLogin } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('admin_list_users');
    if (err) setError(err.message);
    else setRows((data as UserRow[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  if (isLoading) {
    return <main style={{ minHeight: '60vh', paddingTop: 118, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} /></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '138px 20px 48px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 40, height: 40, color: 'var(--teal)', marginBottom: 12 }} />
        <h1 style={{ margin: '0 0 8px', color: 'var(--ink-teal)' }}>Admin access required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Sign in with an authorized ops account to view users.</p>
        {!user && <Button variant="primary" onClick={() => openLogin('/admin/users')}>Sign in</Button>}
      </main>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => [r.full_name, r.email, r.phone].some((v) => v?.toLowerCase().includes(q)))
    : rows;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '118px 16px 60px' }}>
      <AdminNav />
      <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: 'var(--ink-teal)' }}>Users</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: '0.9rem' }}>
        {rows.length} registered customer{rows.length === 1 ? '' : 's'}. Companion accounts are managed separately.
      </p>

      <Input placeholder="Search by name, email, or phone" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16 }} />

      {error && <p style={{ color: 'var(--terracotta)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--teal)' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-lg)' }}>No users match.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                {(r.full_name || r.email || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--ink-teal)' }}>{r.full_name || 'Unnamed'}</strong>
                  {!r.onboarding_completed && <Badge tone="neutral" size="sm">onboarding incomplete</Badge>}
                  {r.booking_count > 0 && <Badge tone="teal" size="sm">{r.booking_count} booking{r.booking_count === 1 ? '' : 's'}</Badge>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {r.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail style={{ width: 12, height: 12 }} />{r.email}</span>}
                  {r.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone style={{ width: 12, height: 12 }} />{r.phone}</span>}
                  {r.age != null && <span>{r.age} yrs</span>}
                </div>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted)', flexShrink: 0 }}>joined {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
