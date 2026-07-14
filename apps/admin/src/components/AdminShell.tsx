'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Button } from '@caresy/ui';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';

// Shared admin chrome: sticky top bar with brand + nav + account, a page shell
// (title/subtitle/actions + width-capped container), an access guard, a toast
// hook, and skeleton placeholders. Every /admin* page composes these so the
// whole panel reads as one product. Styles live in app/admin.css (.adm-*).

const LINKS = [
  { href: '/ops', label: 'Dispatch' },
  { href: '/companions', label: 'Companions' },
  { href: '/service-areas', label: 'Service areas' },
  { href: '/users', label: 'Users' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
  { href: '/notifications', label: 'Notifications' },
];

export function AdminTopbar() {
  const pathname = usePathname();
  const { user, openLogin, signOut } = useAuth();
  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <header className="adm-topbar">
      <div className="adm-topbar-in">
        <Link href="/ops" className="adm-brand">
          <span className="adm-brand-dot" />Caresy<span className="adm-brand-sub">Admin</span>
        </Link>
        <nav className="adm-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'is-active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="adm-top-right">
          {user ? (
            <>
              <span className="adm-user" title={user.email ?? undefined}>{initial}</span>
              <button className="adm-signout" onClick={() => signOut()} aria-label="Sign out" title="Sign out">
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => openLogin()}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function AdminShell({
  title, subtitle, actions, maxWidth = 880, children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminTopbar />
      <main className="adm-main" style={{ maxWidth }}>
        <header className="adm-head">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="adm-head-actions">{actions}</div>}
        </header>
        {children}
      </main>
    </>
  );
}

/**
 * Renders children only for a signed-in admin. Shows a centered loader while
 * auth resolves; a sign-in gate when signed out; and — new vs the old pages —
 * a clear "this account isn't an admin" state (with sign-out) instead of a
 * dead end when someone signs in with a non-ops account.
 */
export function AdminGuard({ purpose, children }: { purpose: string; children: React.ReactNode }) {
  const { user, isAdmin, isLoading, openLogin, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="adm-guard-load">
        <Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--teal)' }} />
      </div>
    );
  }
  if (!user || !isAdmin) {
    return (
      <div className="adm-gate">
        <span className="adm-gate-ico"><ShieldCheck style={{ width: 28, height: 28 }} /></span>
        <h1>Admin access required</h1>
        {user ? (
          <>
            <p>
              You&apos;re signed in as <strong>{user.email}</strong>, which isn&apos;t an authorized ops
              account. Switch to an admin account to {purpose}.
            </p>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </>
        ) : (
          <>
            <p>Sign in with an authorized ops account to {purpose}.</p>
            <Button variant="primary" onClick={() => openLogin()}>Sign in</Button>
          </>
        )}
      </div>
    );
  }
  return <>{children}</>;
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const node = toast ? <div className={`adm-toast ${toast.tone}`}>{toast.msg}</div> : null;
  return { show, node };
}

/** N shimmer placeholders, h px tall each — shown while the first fetch runs. */
export function Skels({ n = 3, h = 76 }: { n?: number; h?: number }) {
  return (
    <div className="adm-list">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="adm-skel" style={{ height: h }} />)}
    </div>
  );
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}m ago` : 'just now';
}
