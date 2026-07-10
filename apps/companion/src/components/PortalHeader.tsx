'use client';

import React from 'react';
import { useAuth } from '@caresy/auth';
import { HeartHandshake, LogOut } from 'lucide-react';

/** Branded top bar so the portal reads as its own product, not a bare page. */
export function PortalHeader() {
  const { user, signOut } = useAuth();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: 'var(--teal)', color: '#fff' }}>
          <HeartHandshake style={{ width: 18, height: 18 }} />
        </span>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--ink-teal)', lineHeight: 1.1 }}>Caresy</div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--teal)' }}>Companion portal</div>
        </div>
      </div>
      {user && (
        <button onClick={signOut} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
          <LogOut style={{ width: 14, height: 14 }} /> Sign out
        </button>
      )}
    </header>
  );
}
