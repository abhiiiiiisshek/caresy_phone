'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, MoreVertical, Share, HousePlus } from 'lucide-react';
import { PhoneHero, BrowserBarArt, MenuListArt, ConfirmCardArt, SafariBarArt, LeafSprig } from './InstallPromptArt';

// Add-to-home-screen guide modal. On Android/Chrome we capture
// `beforeinstallprompt` and fire the native installer from the green CTA; iOS
// Safari has no such API, so the modal doubles as an illustrated step guide for
// both platforms. Shown once (gated on cookie consent so it never stacks with
// the cookie banner); dismissal is remembered. Artwork lives in
// InstallPromptArt.tsx.

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SEEN_KEY = 'installPromptSeen';
const G = 'var(--m3-green, #08796f)';
const INK = 'var(--m3-ink, #16302b)';
const MUTED = 'var(--m3-muted, #5b6b64)';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(SEEN_KEY) || !localStorage.getItem('cookieConsent')) return;

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); setOpen(true); };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS never fires beforeinstallprompt — still show the guide after a beat.
    let t: ReturnType<typeof setTimeout> | undefined;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) t = setTimeout(() => setOpen(true), 1500);

    return () => { window.removeEventListener('beforeinstallprompt', onBIP); if (t) clearTimeout(t); };
  }, []);

  const close = () => { localStorage.setItem(SEEN_KEY, '1'); setOpen(false); };

  const install = async () => {
    if (!deferred) return; // iOS: the on-screen steps are the path
    await deferred.prompt();
    await deferred.userChoice;
    close();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Caresy to your home screen"
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,30,26,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '24px 12px 0' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto', background: 'var(--m3-bg, #f2f4ef)', borderRadius: '28px 28px 0 0', position: 'relative', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}
      >
        {/* grab handle + close */}
        <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'center', padding: '12px 0 4px', background: 'linear-gradient(180deg, var(--m3-bg,#f2f4ef) 70%, transparent)' }}>
          <span style={{ width: 44, height: 5, borderRadius: 999, background: '#c0c9c3' }} />
        </div>
        <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, zIndex: 3, display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', color: INK, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>

        {/* hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 20px' }}>
          <PhoneHero />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: G }}>Add Caresy<br />to your Home screen</h2>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: '20px', color: MUTED }}>One tap away for faster access and a better experience.</p>
          </div>
        </div>

        {/* platform guides */}
        <div style={{ padding: '0 16px 8px', display: 'grid', gap: 20 }}>
          <PlatformSection
            label="For Android (Chrome)"
            badge={<AndroidMark />}
            steps={[
              { n: 1, cap: <>Tap the <MoreVertical style={ic} /> menu in the top right</>, art: <BrowserBarArt /> },
              { n: 2, cap: <>Select &ldquo;Add to Home screen&rdquo;</>, art: <MenuListArt highlight={3} items={[{ label: 'New tab', icon: 'plus' }, { label: 'Bookmarks', icon: 'star' }, { label: 'Recent tabs', icon: 'clock' }, { label: 'Add to Home screen', icon: 'home' }]} /> },
              { n: 3, cap: <>Tap &ldquo;Add&rdquo; to confirm</>, art: <ConfirmCardArt title="Add to Home screen" /> },
            ]}
          />
          <PlatformSection
            label="For iPhone (Safari)"
            badge={<AppleMark />}
            steps={[
              { n: 1, cap: <>Tap the Share <Share style={ic} /> button at the bottom</>, art: <SafariBarArt /> },
              { n: 2, cap: <>Select &ldquo;Add to Home Screen&rdquo;</>, art: <MenuListArt highlight={3} items={[{ label: 'Add to Reading List', icon: 'ring' }, { label: 'Add Bookmark', icon: 'book' }, { label: 'Add to Favorites', icon: 'star' }, { label: 'Add to Home Screen', icon: 'home' }]} /> },
              { n: 3, cap: <>Tap &ldquo;Add&rdquo; to confirm</>, art: <ConfirmCardArt title="Add to Home Screen" /> },
            ]}
          />
        </div>

        {/* sticky CTA */}
        <div style={{ position: 'sticky', bottom: 0, marginTop: 8, padding: 16, background: 'linear-gradient(0deg, var(--m3-bg,#f2f4ef) 78%, transparent)' }}>
          <LeafSprig style={{ position: 'absolute', right: 8, bottom: 68, opacity: 0.9, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, background: '#e7f0ea', border: '1px solid #d3e3d8' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: '#fff', flexShrink: 0 }}>
              <Sparkles style={{ width: 18, height: 18, color: G }} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>One tap away, always here for you.</div>
              <div style={{ fontSize: 12, color: MUTED }}>Add Caresy to stay connected and get help, anytime.</div>
            </div>
            {deferred && (
              <button onClick={install} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 999, border: 'none', background: G, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                <HousePlus style={{ width: 18, height: 18 }} /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ic: React.CSSProperties = { width: 14, height: 14, verticalAlign: '-2px', display: 'inline' };

function PlatformSection({ label, badge, steps }: { label: string; badge: React.ReactNode; steps: { n: number; cap: React.ReactNode; art: React.ReactNode }[] }) {
  return (
    <section>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: '#e7f0ea', marginBottom: 12 }}>
        {badge}
        <span style={{ fontWeight: 700, fontSize: 14, color: G }}>{label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {steps.map((s) => (
          <div key={s.n}>
            <div style={{ height: 96, borderRadius: 14, background: '#fff', border: '1px solid var(--m3-line, #e1e3de)', overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 6 }}>{s.art}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: G, color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.n}</span>
              <span style={{ fontSize: 11.5, lineHeight: '15px', color: MUTED }}>{s.cap}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AndroidMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={G} aria-hidden="true">
      <path d="M6 9h12v7a1 1 0 0 1-1 1h-1v3a1 1 0 0 1-2 0v-3h-4v3a1 1 0 0 1-2 0v-3H7a1 1 0 0 1-1-1zM3.5 9a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1zm17 0a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1zM7.2 7.8A5 5 0 0 1 9.4 4.9l-.9-1.4a.3.3 0 0 1 .5-.3l1 1.5a6 6 0 0 1 4 0l1-1.5a.3.3 0 1 1 .5.3l-.9 1.4a5 5 0 0 1 2.2 2.9zM10 6.6a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4zm4 0a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill={INK} aria-hidden="true">
      <path d="M16 12.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.8-.8-2.9-.8c-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.9.7 2-1.1 2.7-2.1c.8-1.2 1.2-2.4 1.2-2.4s-2.3-.9-2.3-3.5zM13.9 6c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z" />
    </svg>
  );
}
