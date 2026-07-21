'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, MoreVertical, Share, Star, Bookmark, Clock, HousePlus, Plus, Check } from 'lucide-react';

// Add-to-home-screen guide modal. On Android/Chrome we capture
// `beforeinstallprompt` and fire the native installer from the green CTA; iOS
// Safari has no such API, so the modal doubles as an illustrated step guide for
// both platforms. Shown once (gated on cookie consent so it never stacks with
// the cookie banner); dismissal is remembered.
// ponytail: step "screenshots" are icon-built cards, not bespoke SVG art. Swap
// in real illustration assets if design wants pixel parity with the mockup.

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 24px 20px' }}>
          <PhoneGlyph />
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
              { n: 1, cap: <>Tap the <MoreVertical style={ic} /> menu in the top right</>, art: <MenuArt highlight="Add to Home screen" /> },
              { n: 2, cap: <>Select &ldquo;Add to Home screen&rdquo;</>, art: <ListArt items={[['New tab', Plus], ['Bookmarks', Star], ['Recent tabs', Clock], ['Add to Home screen', HousePlus]]} highlight={3} /> },
              { n: 3, cap: <>Tap &ldquo;Add&rdquo; to confirm</>, art: <ConfirmArt /> },
            ]}
          />
          <PlatformSection
            label="For iPhone (Safari)"
            badge={<AppleMark />}
            steps={[
              { n: 1, cap: <>Tap the Share <Share style={ic} /> button at the bottom</>, art: <ShareArt /> },
              { n: 2, cap: <>Select &ldquo;Add to Home Screen&rdquo;</>, art: <ListArt items={[['Add to Reading List', Bookmark], ['Add Bookmark', Bookmark], ['Add to Favorites', Star], ['Add to Home Screen', HousePlus]]} highlight={3} /> },
              { n: 3, cap: <>Tap &ldquo;Add&rdquo; to confirm</>, art: <ConfirmArt /> },
            ]}
          />
        </div>

        {/* sticky CTA */}
        <div style={{ position: 'sticky', bottom: 0, marginTop: 8, padding: 16, background: 'linear-gradient(0deg, var(--m3-bg,#f2f4ef) 78%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, background: '#e7f0ea', border: '1px solid #d3e3d8' }}>
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
            <div style={{ height: 92, borderRadius: 14, background: '#fff', border: '1px solid var(--m3-line, #e1e3de)', overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 6 }}>{s.art}</div>
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

// --- Icon-built step "screenshots" (ponytail: stand-ins for real art) ---

function PhoneGlyph() {
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 76, height: 96, borderRadius: 16, border: `3px solid ${G}`, background: '#fff', display: 'grid', placeItems: 'center' }}>
      <HousePlus style={{ width: 34, height: 34, color: G }} />
      <span style={{ position: 'absolute', top: -6, right: -6 }}><Sparkles style={{ width: 18, height: 18, color: 'var(--m3-marigold, #e6a417)' }} /></span>
    </div>
  );
}

function MenuArt({ highlight }: { highlight: string }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f6f7f5', borderRadius: 8 }}>
      <MoreVertical style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, color: INK }} />
      <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 8, color: MUTED }}>{highlight}</span>
    </div>
  );
}

function ListArt({ items, highlight }: { items: [string, React.ComponentType<{ style?: React.CSSProperties }>][]; highlight: number }) {
  return (
    <div style={{ width: '100%', display: 'grid', gap: 3, fontSize: 7.5 }}>
      {items.map(([label, Icon], i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 4px', borderRadius: 4, background: i === highlight ? '#e7f0ea' : 'transparent', color: i === highlight ? G : MUTED, fontWeight: i === highlight ? 700 : 400 }}>
          <Icon style={{ width: 9, height: 9 }} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmArt() {
  return (
    <div style={{ width: '100%', display: 'grid', gap: 5, placeItems: 'center' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${G}`, color: G, fontWeight: 800, fontSize: 12 }}>C</span>
      <span style={{ fontSize: 8, color: MUTED }}>Caresy</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 999, background: G, color: '#fff', fontSize: 8, fontWeight: 700 }}><Check style={{ width: 8, height: 8 }} />Add</span>
    </div>
  );
}

function ShareArt() {
  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, border: `1.5px solid ${G}` }}>
        <Share style={{ width: 16, height: 16, color: G }} />
      </span>
    </div>
  );
}

function AndroidMark() {
  return <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: G, color: '#fff', fontSize: 11, fontWeight: 800 }}>▲</span>;
}
function AppleMark() {
  return <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: INK, color: '#fff', fontSize: 12, fontWeight: 800 }}></span>;
}
