'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/ops', label: 'Dispatch' },
  { href: '/companions', label: 'Companions' },
  { href: '/service-areas', label: 'Service areas' },
  { href: '/users', label: 'Users' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
  { href: '/notifications', label: 'Notifications' },
];

/** Shared tab row across all /admin* pages so they read as one hub. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link key={l.href} href={l.href} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            background: active ? 'var(--teal)' : 'transparent',
            color: active ? '#fff' : 'var(--muted)',
            border: `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
          }}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
