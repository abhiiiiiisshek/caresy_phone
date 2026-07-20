'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

// Add-to-home-screen prompt. Android/Chrome fire `beforeinstallprompt` — we stash
// it and trigger the native installer on tap. iOS Safari has no such event, so we
// show the manual Share → Add to Home Screen hint instead. Mirrors CookieBanner's
// look/dismiss pattern. Gated on cookie consent already set so the two fixed
// bottom banners never stack.

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'installPromptDismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    // iOS Safari exposes its own flag
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed, already dismissed, or cookie banner not resolved yet.
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) || !localStorage.getItem('cookieConsent')) return;

    const onBIP = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; show our own UI
      setDeferred(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS gets no beforeinstallprompt — offer the manual route.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      const t = setTimeout(() => setIosHint(true), 1500);
      return () => { window.removeEventListener('beforeinstallprompt', onBIP); clearTimeout(t); };
    }
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setDeferred(null); setIosHint(false); };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice; // 'accepted' | 'dismissed' — either way stop showing it
    dismiss();
  };

  if (!deferred && !iosHint) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20, right: 20, maxWidth: 420,
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 24,
      padding: 20, boxShadow: 'var(--shadow-2)', zIndex: 100, textAlign: 'left',
    }}>
      <button onClick={dismiss} aria-label="Dismiss" style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
        <X style={{ width: 18, height: 18 }} />
      </button>

      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--ink)' }}>
        <Download style={{ color: 'var(--primary)', width: 20, height: 20 }} />
        Add Caresy to Home Screen
      </h3>

      {deferred ? (
        <>
          <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: '0 0 15px', lineHeight: 1.45 }}>
            Install Caresy for one-tap access and a full-screen app experience — no store needed.
          </p>
          <button className="btn btn-primary" onClick={install} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 38, padding: '8px 16px', fontSize: '0.88rem', borderRadius: 12, width: '100%', cursor: 'pointer' }}>
            <Download style={{ width: 16, height: 16 }} /> Install
          </button>
        </>
      ) : (
        <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          Tap the Share icon <Share style={{ width: 15, height: 15, verticalAlign: '-2px', color: 'var(--primary)' }} /> in Safari, then choose <strong style={{ color: 'var(--ink)' }}>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}
