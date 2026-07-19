'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Loader2, ShieldCheck } from 'lucide-react';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.4 34.9 44 29.9 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

export default function Login() {
  const { user, profile, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [isLoading, user, router]);

  const firstName = profile?.full_name?.split(' ')[0] || (user?.user_metadata?.name as string)?.split(' ')[0];

  return (
    <main id="main-content" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--m3-bg)', fontFamily: EPILOGUE, overflow: 'hidden' }}>
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'absolute', top: '-9%', left: '-10%', right: '60%', bottom: '65%', borderRadius: '50%', background: '#baeed9', filter: 'blur(50px)', mixBlendMode: 'multiply', opacity: 0.3 }} />
      <div aria-hidden style={{ position: 'absolute', top: '56%', left: '50%', right: '-10%', bottom: '-9%', borderRadius: '50%', background: '#9af0fa', filter: 'blur(60px)', mixBlendMode: 'multiply', opacity: 0.2 }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Logo + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/caresy-logo.png" alt="Caresy" style={{ height: 40, width: 'auto' }} />
          <p style={{ margin: 0, fontSize: 16, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>Wellness, centered around you.</p>
        </div>

        {/* Hero circle */}
        <div style={{ width: '100%', maxWidth: 280, aspectRatio: '1', borderRadius: '50%', background: 'var(--m3-chip)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.05)', display: 'grid', placeItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/booking-confirmed.jpg" alt="" style={{ width: '78%', height: '78%', borderRadius: '50%', objectFit: 'cover', opacity: 0.9 }} />
        </div>

        {/* Welcome card */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, padding: 24, borderRadius: 'var(--m3-radius-card)', background: 'rgba(248,250,245,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-ink)' }}>
              {firstName ? 'Welcome back' : 'Welcome to Caresy'}
            </h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 999, background: '#e1e3de' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#006971' }} />
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>
                {firstName || 'Trusted hospital companions'}
              </span>
            </span>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px 24px', borderRadius: 999, border: 'none', background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          >
            {isLoading ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <GoogleMark />}
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ flex: 1, height: 1, background: '#c0c9c3' }} />
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: '#707974' }}>safe &amp; secure</span>
            <span style={{ flex: 1, height: 1, background: '#c0c9c3' }} />
          </div>

          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 0, fontSize: 12, letterSpacing: '0.5px', color: 'var(--m3-muted)', textAlign: 'center' }}>
            <ShieldCheck style={{ width: 14, height: 14, color: 'var(--m3-green)', flexShrink: 0 }} />
            One tap signs you in — new accounts are created automatically.
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 14, letterSpacing: '0.25px', color: '#0a0b0d' }}>
          Just browsing? <Link href="/" style={{ color: '#006971', fontWeight: 500, textDecoration: 'none' }}>Explore Caresy first</Link>
        </p>
      </div>
    </main>
  );
}
