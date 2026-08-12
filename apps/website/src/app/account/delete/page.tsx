'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Button, Reveal } from '@caresy/ui';
import { AlertTriangle, Loader2, Check } from 'lucide-react';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

export default function DeleteAccount() {
  const { user, isLoading, openLogin, signOut } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not delete your account.');
      }
      setDone(true);
      await signOut();
      setTimeout(() => router.push('/'), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete your account.');
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto', padding: '32px 16px' }}>{children}</div>
    </main>
  );

  if (isLoading) {
    return shell(
      <div style={{ display: 'grid', placeItems: 'center', padding: '80px 0' }}>
        <Loader2 style={{ width: 40, height: 40, color: 'var(--m3-green)' }} className="animate-spin" />
      </div>
    );
  }

  if (done) {
    return shell(
      <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)' }}>
        <div style={{ width: 72, height: 72, margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(39,168,117,0.14)', color: '#1e7e58', display: 'grid', placeItems: 'center' }}>
          <Check style={{ width: 36, height: 36 }} strokeWidth={3} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--m3-green-deep)' }}>Account deleted</h1>
        <p style={{ color: 'var(--m3-muted)', margin: 0 }}>Your account and personal data have been permanently removed. Taking you home…</p>
      </div>
    );
  }

  if (!user) {
    return shell(
      <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--m3-green-deep)' }}>Delete account</h1>
        <p style={{ color: 'var(--m3-muted)', margin: '0 0 20px' }}>Sign in to delete your Caresy account.</p>
        <Button variant="primary" onClick={() => openLogin('/account/delete')}>Sign In</Button>
      </div>
    );
  }

  return shell(
    <Reveal>
      <h1 style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)', margin: '0 0 24px' }}>Delete account</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-bg)', border: '1px solid rgba(196,85,67,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--m3-urgent-bg)', color: 'var(--m3-urgent-ink)', flexShrink: 0 }}>
            <AlertTriangle style={{ width: 20, height: 20 }} />
          </span>
          <div>
            <strong style={{ display: 'block', fontSize: 16, color: 'var(--m3-ink)', marginBottom: 4 }}>This is permanent</strong>
            <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--m3-muted)' }}>
              Deleting your account ({user.email}) permanently removes your profile, patient records, saved locations, booking history and care logs. This cannot be undone.
            </p>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 14, color: 'var(--m3-muted)' }}>
          Type <strong style={{ color: 'var(--m3-urgent-ink)' }}>DELETE</strong> to confirm.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          aria-label="Type DELETE to confirm"
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--m3-line)', background: 'var(--m3-surface)', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        {error && <p style={{ margin: 0, fontSize: 14, color: 'var(--m3-urgent-ink)' }}>{error}</p>}

        <button
          onClick={handleDelete}
          disabled={confirm.trim().toUpperCase() !== 'DELETE' || busy}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
            padding: '16px 32px', borderRadius: 999, border: 'none',
            background: 'var(--m3-urgent)', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
            cursor: confirm.trim().toUpperCase() === 'DELETE' && !busy ? 'pointer' : 'default',
            opacity: confirm.trim().toUpperCase() === 'DELETE' && !busy ? 1 : 0.5,
          }}
        >
          {busy ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <AlertTriangle style={{ width: 18, height: 18 }} />}
          {busy ? 'Deleting…' : 'Permanently delete my account'}
        </button>

        <button
          onClick={() => router.push('/profile')}
          disabled={busy}
          style={{ width: '100%', padding: '12px', borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--m3-muted)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </Reveal>
  );
}
