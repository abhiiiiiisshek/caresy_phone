'use client';

import { useEffect, useRef, useState } from 'react';

// Cinematic splash for the Capacitor shell (apps/mobile).
//
// The seam this closes: the shell's webview loads the LIVE site, so the native
// splash auto-hides on a timer while the page is still fetching over mobile
// data — and the gap between them is a white webview. That white flash is the
// single cheapest-looking moment in the whole app.
//
// So the handoff is inverted, exactly as the Expo app's SplashGate does it:
//   1. the native splash is told to hold (capacitor.config launchShowDuration
//      is raised to a ceiling, not a cue);
//   2. this overlay paints, pixel-matched to the native splash — same cream,
//      same centred mark;
//   3. only THEN do we call SplashScreen.hide(), so the thing revealed
//      underneath the native splash is already the identical picture;
//   4. this overlay animates away on its own curve.
// The user sees one continuous surface. There is no frame where neither is up.
//
// On a plain browser this renders nothing at all: the page paints in
// milliseconds and a splash there would be an invented delay, not a covered one.

const MIN_VISIBLE_MS = 1500; // below this a splash reads as a flicker
const MAX_VISIBLE_MS = 2500; // ceiling — never hold the app hostage to a slow load

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, { hide?: () => Promise<void> }>;
};

export default function NativeSplash() {
  const [phase, setPhase] = useState<'idle' | 'showing' | 'leaving' | 'gone'>('idle');
  const shownAt = useRef(0);

  // Step 1: confirm we are in the shell. The state flip happens inside a frame
  // callback rather than in the effect body — same frame budget, but it keeps
  // the write out of the render cascade.
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return; // plain browser — render nothing, ever
    shownAt.current = Date.now();
    const id = requestAnimationFrame(() => setPhase('showing'));
    return () => cancelAnimationFrame(id);
  }, []);

  // Step 2: this runs after the overlay has been committed and painted, which
  // is the ordering that matters — the native splash is only released once the
  // identical picture already exists underneath it. Releasing it any earlier is
  // the white flash we are here to remove.
  useEffect(() => {
    if (phase !== 'showing') return;
    const id = requestAnimationFrame(() => {
      const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
      cap?.Plugins?.SplashScreen?.hide?.().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // Step 3: leave once the document is ready and the floor has elapsed, or at
  // the ceiling regardless. `readyState` is the honest signal here — the shell
  // is loading a remote page, so "ready" means the site itself has loaded, not
  // that React mounted.
  useEffect(() => {
    if (phase !== 'showing') return;
    let done = false;
    const leave = () => {
      if (done) return;
      done = true;
      setPhase('leaving');
      // Matches the CSS exit duration below; unmounting on time keeps the
      // overlay from eating taps a frame longer than it is visible.
      setTimeout(() => setPhase('gone'), 520);
    };

    const elapsed = () => Date.now() - shownAt.current;
    const whenReady = () => setTimeout(leave, Math.max(0, MIN_VISIBLE_MS - elapsed()));

    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady, { once: true });

    const ceiling = setTimeout(leave, Math.max(0, MAX_VISIBLE_MS - elapsed()));
    return () => {
      clearTimeout(ceiling);
      window.removeEventListener('load', whenReady);
    };
  }, [phase]);

  if (phase === 'idle' || phase === 'gone') return null;

  return (
    <div
      className={`caresy-splash${phase === 'leaving' ? ' is-leaving' : ''}`}
      role="progressbar"
      aria-label="Caresy is starting"
      aria-busy="true"
    >
      {/* Three ambient washes on one shared drift. Blurred radial gradients,
          composited — they never trigger layout or paint of anything else. */}
      <div className="caresy-splash__amb caresy-splash__amb--a" />
      <div className="caresy-splash__amb caresy-splash__amb--b" />
      <div className="caresy-splash__amb caresy-splash__amb--c" />

      <div className="caresy-splash__mark">
        {/* eslint-disable-next-line @next/next/no-img-element -- this paints
            before hydration finishes; next/image adds a wrapper and a loader
            that would delay the one element that must be instant. */}
        <img src="/splash-mark.png" alt="" width={114} height={136} draggable={false} />
      </div>
      <p className="caresy-splash__word">Your Care, Our Priority</p>
    </div>
  );
}
