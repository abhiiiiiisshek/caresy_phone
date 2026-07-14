'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@caresy/auth/supabase/client';
import { Badge, Input } from '@caresy/ui';
import { AdminShell, AdminGuard, Skels } from '@/components/AdminShell';
import { Mail, Phone } from 'lucide-react';

// Customer directory. Reads via the admin_list_users() RPC (migration 15) since
// profiles has no email column — email lives in auth.users, which
// anon/authenticated can't read directly. Search is client-side and instant.

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
  return (
    <AdminShell title="Users" subtitle="Registered customers. Companion accounts are managed separately." maxWidth={900}>
      <AdminGuard purpose="view users">
        <UsersList />
      </AdminGuard>
    </AdminShell>
  );
}

function UsersList() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase.rpc('admin_list_users');
      if (!alive) return;
      if (err) setError(err.message);
      setRows((data as UserRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => q
      ? (rows ?? []).filter((r) => [r.full_name, r.email, r.phone].some((v) => v?.toLowerCase().includes(q)))
      : (rows ?? []),
    [rows, q],
  );

  return (
    <>
      <Input placeholder="Search by name, email, or phone" value={search}
        onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16 }} />

      {error && <p className="adm-error">{error}</p>}

      {rows === null ? (
        <Skels n={5} h={72} />
      ) : filtered.length === 0 ? (
        <div className="adm-empty">{q ? 'No users match your search.' : 'No registered customers yet.'}</div>
      ) : (
        <div className="adm-list">
          {filtered.map((r) => (
            <div key={r.id} className="adm-card adm-row">
              <div className="adm-avatar">{(r.full_name || r.email || '?').charAt(0).toUpperCase()}</div>
              <div className="adm-row-main">
                <div className="adm-name-row">
                  <strong>{r.full_name || 'Unnamed'}</strong>
                  {!r.onboarding_completed && <Badge tone="neutral" size="sm">onboarding incomplete</Badge>}
                  {r.booking_count > 0 && <Badge tone="teal" size="sm">{r.booking_count} booking{r.booking_count === 1 ? '' : 's'}</Badge>}
                </div>
                <div className="adm-meta">
                  {r.email && <span><Mail />{r.email}</span>}
                  {r.phone && <span><Phone />{r.phone}</span>}
                  {r.age != null && <span>{r.age} yrs</span>}
                </div>
              </div>
              <span className="adm-side-note">
                joined {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
