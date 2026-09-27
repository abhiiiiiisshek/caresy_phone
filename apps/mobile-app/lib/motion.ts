// Animation utilities — the single source of motion truth for the native app.
//
// Everything here drives `transform` or `opacity` only, with
// `useNativeDriver: true`, so frames are produced on the UI thread and survive
// a busy JS thread (a Supabase round-trip, a re-render storm). That is the
// whole 60 FPS strategy: no layout property is ever animated, so there is no
// layout pass per frame and nothing to thrash.
//
// Durations/easing come from `theme.motion` so a motion change is one edit.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type LayoutChangeEvent } from 'react-native';

import { motion } from './theme';
import { backoffMs as backoffMath, staggerDelay as staggerMath, holdFor } from './motionMath';

export const EASE_OUT = Easing.bezier(...(motion.ease as unknown as [number, number, number, number]));

/* ---------- Reduce Motion ---------- */

// Cached at module scope so non-hook code (screen options, one-shot springs)
// can branch without waiting on an async accessibility query.
let reduceMotionCache = false;
export function isReduceMotion() { return reduceMotionCache; }

AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotionCache = v; }).catch(() => {});

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { reduceMotionCache = v; if (alive) setReduce(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reduceMotionCache = v;
      if (alive) setReduce(v);
    });
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

/* ---------- Stagger cadence ---------- */

// Entrance delay for the Nth child. Capped so a 40-row list does not make the
// last row wait 2.2 seconds — past `cap` everything lands together, which is
// what the eye reads as "the list arrived" anyway.
// Reduce Motion collapses the cadence to zero: content still fades, but nobody
// is made to wait on choreography they asked the OS to switch off.
export function staggerDelay(index: number, reduce = reduceMotionCache, step = motion.stagger, cap = 7): number {
  return staggerMath(index, reduce, step, cap);
}

/* ---------- Entrance ---------- */

// Fade + rise. Returns a style object; the caller spreads it onto an
// Animated.View. Reduce Motion drops the translate and shortens the fade to a
// plain cross-dissolve (WCAG 2.3.3 — motion from interaction is removable).
export function useEnter(opts: { delay?: number; distance?: number; duration?: number } = {}) {
  const reduce = useReduceMotion();
  const { delay = 0, distance = 14, duration = 480 } = opts;
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: reduce ? motion.duration.fast : duration,
      delay: reduce ? 0 : delay,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [a, delay, duration, reduce]);
  return {
    opacity: a,
    transform: reduce ? [] : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

/* ---------- Press ---------- */

// The premium press: scale down on touch-down, spring back on release. Replaces
// the Android ripple (which is a Material signature, not ours) and replaces
// Pressable's `pressed` style flag — a style flag snaps, this interpolates, and
// it keeps responding mid-gesture if the finger returns.
export function usePressScale(to = 0.97) {
  const reduce = useReduceMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const run = useCallback((v: number) => {
    if (reduce) return;
    Animated.spring(scale, { toValue: v, ...motion.spring.default, useNativeDriver: true }).start();
  }, [reduce, scale]);
  return {
    scale,
    onPressIn: useCallback(() => run(to), [run, to]),
    onPressOut: useCallback(() => run(1), [run]),
  };
}

/* ---------- Loops ---------- */

// Shimmer sweep for skeletons. Measures its own width via onLayout so the
// highlight band travels exactly one container width — a fixed pixel distance
// would crawl on a tablet and blur on a phone.
export function useShimmer(active = true) {
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!active || reduce || width === 0) return;
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => { loop.stop(); a.setValue(0); };
  }, [a, active, reduce, width]);
  return {
    onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
    width,
    // Reduce Motion: park the band off-screen so the skeleton is a calm static
    // block rather than a strobing one.
    translateX: reduce || width === 0
      ? new Animated.Value(-9999)
      : a.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }),
  };
}

// Slow breathing scale — used on the splash logo so a long cold start reads as
// "alive and working" instead of "frozen at the last frame".
export function useBreathe(active = true, amount = 0.035) {
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!active || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [a, active, reduce]);
  return a.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amount] });
}

// Continuous rotation, for the ring the primary button morphs into.
export function useSpin(active = true, duration = 900) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!active) { a.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); };
  }, [a, active, duration]);
  return a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
}

/* ---------- Ambient drift ---------- */

// One shared driver for the splash's light streaks. A single Animated.Value
// feeding N interpolations costs one native animation, not N.
export function useAmbient(active = true, duration = 9000) {
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!active || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [a, active, duration, reduce]);
  return a;
}

/* ---------- Retry backoff ---------- */

// Exponential backoff with full jitter, used by SmartImage and the network
// probe. Jitter matters: without it every failed image on a screen retries in
// the same frame and a flaky connection gets hammered in lockstep.
export function backoffMs(attempt: number, base = 400, ceiling = 8000): number {
  return backoffMath(attempt, base, ceiling);
}

/* ---------- Minimum visible duration ---------- */

// Guards the "flash of skeleton": if data arrives in 90ms, showing and hiding a
// skeleton is a flicker that reads as a glitch. This holds a loading state for
// at least `floor` ms once it has been shown, so every wait is either invisible
// or deliberate — never a blink.
export function useSettledLoading(loading: boolean, floor = 350): boolean {
  const [tail, setTail] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) { shownAt.current = Date.now(); return; }
    const wait = holdFor(shownAt.current === null ? null : Date.now() - shownAt.current, floor);
    shownAt.current = null;
    if (wait === 0) return;
    // The hold is a wall-clock fact (how long the skeleton has been visible),
    // not something derivable from props during render — so it has to be a
    // state write here. It runs once per load, not per frame.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTail(true);
    const t = setTimeout(() => setTail(false), wait);
    return () => clearTimeout(t);
  }, [loading, floor]);

  return loading || tail;
}
