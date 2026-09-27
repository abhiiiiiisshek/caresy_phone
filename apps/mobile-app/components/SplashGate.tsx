// Cinematic cold-launch splash.
//
// The handoff problem this solves: expo-splash-screen shows a *static* native
// image, then tears it down and hands control to React — and between those two
// moments you get a white flash, because the native splash and the first React
// frame are different surfaces. So we never let the native splash hide on its
// own (`preventAutoHideAsync` at module scope, before any render). Instead this
// component mounts a full-screen React view that is pixel-identical to the
// native splash, hides the native one underneath it, and then animates *that*
// away. The user sees one continuous surface; there is no seam to flash.
//
// It also enforces a minimum on-screen time. A splash that appears for 120ms
// is a flicker; one that is dismissed the instant auth resolves is unpredictable.
// Holding to ~1.5s and stretching to the real wait makes every launch feel the
// same length, which is what "intentional" means here.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';


import { color, space, type } from '../lib/theme';
import { useAmbient, useBreathe, useReduceMotion } from '../lib/motion';

// Called at import time, i.e. before the first render, which is the only point
// early enough to win the race against the native splash auto-hiding.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Metro resolves image assets through require(); there is no ESM form for a
// bundled PNG without a global asset .d.ts, which this app does not have.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../assets/splash-icon.png');

const MIN_VISIBLE_MS = 1500; // floor — below this the splash reads as a glitch
const MAX_VISIBLE_MS = 2500; // ceiling — past this we show the app regardless

const { width: W, height: H } = Dimensions.get('window');

/* ---------- Light streaks ---------- */

// Three soft, very low-opacity ellipses drifting off one shared driver. Real
// particles would mean N animations and a per-frame JS cost; these are three
// composited translates off a single native animation, which is free.
function Streaks({ driver }: { driver: Animated.Value }) {
  const streaks = [
    { size: W * 1.1, x: -W * 0.3, y: H * 0.12, from: -24, to: 22, tint: 'rgba(138,189,169,0.30)' },
    { size: W * 0.9, x: W * 0.45, y: H * 0.55, from: 20, to: -18, tint: 'rgba(39,168,117,0.18)' },
    { size: W * 0.7, x: W * 0.05, y: H * 0.78, from: -14, to: 16, tint: 'rgba(196,85,67,0.10)' },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {streaks.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            sp.streak,
            {
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
              backgroundColor: s.tint,
              borderRadius: s.size / 2,
              transform: [
                { translateY: driver.interpolate({ inputRange: [0, 1], outputRange: [s.from, s.to] }) },
                { translateX: driver.interpolate({ inputRange: [0, 1], outputRange: [s.to / 2, s.from / 2] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ---------- Gate ---------- */

export function SplashGate({ ready, children }: { ready: boolean; children: ReactNode }) {
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(true); // splash layer present at all
  const [armed, setArmed] = useState(false);    // native splash hidden, ours visible

  const logo = useState(() => new Animated.Value(0))[0];   // logo scale + fade in
  const text = useState(() => new Animated.Value(0))[0];   // wordmark fade in
  const veil = useState(() => new Animated.Value(1))[0];   // whole splash fade out
  const appIn = useState(() => new Animated.Value(0))[0];  // app content fade/scale in

  const breathe = useBreathe(armed && mounted);
  const ambient = useAmbient(armed && mounted);
  const shownAt = useRef(0);

  // Step 1: our splash is painted, so the native one can go. Hiding it from an
  // effect (not from render) guarantees at least one committed React frame
  // underneath it before it disappears.
  useEffect(() => {
    let alive = true;
    (async () => {
      await SplashScreen.hideAsync().catch(() => {});
      if (!alive) return;
      shownAt.current = Date.now();
      setArmed(true);
      Animated.sequence([
        Animated.spring(logo, { toValue: 1, damping: 14, stiffness: 140, mass: 1, useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    })();
    return () => { alive = false; };
  }, [logo, text]);

  // Step 2: leave when the app is ready AND the floor has elapsed — or when the
  // ceiling hits, whichever comes first. The ceiling is what stops a stalled
  // network from holding the splash forever; the app behind it shows skeletons.
  useEffect(() => {
    if (!armed) return;
    const elapsed = Date.now() - shownAt.current;
    const wait = ready ? Math.max(0, MIN_VISIBLE_MS - elapsed) : Math.max(0, MAX_VISIBLE_MS - elapsed);
    const t = setTimeout(() => {
      // Cross-dissolve: the splash fades and lifts while the app fades in and
      // settles from 1.04 → 1. The two overlap, so there is never a frame where
      // neither is painted — that overlap is the "no white flash" guarantee.
      Animated.parallel([
        Animated.timing(veil, {
          toValue: 0,
          duration: reduce ? 160 : 520,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logo, {
          toValue: reduce ? 1 : 1.08,
          duration: reduce ? 160 : 520,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(appIn, {
          toValue: 1,
          duration: reduce ? 160 : 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }, wait);
    return () => clearTimeout(t);
  }, [armed, ready, reduce, veil, logo, appIn]);

  return (
    <View style={sp.root}>
      <Animated.View
        style={[
          sp.app,
          {
            opacity: mounted ? appIn : 1,
            transform: mounted && !reduce
              ? [{ scale: appIn.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }]
              : [],
          },
        ]}
      >
        {children}
      </Animated.View>

      {mounted ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, sp.splash, { opacity: veil }]}
          pointerEvents={ready ? 'none' : 'auto'}
          accessibilityRole="progressbar"
          accessibilityLabel="Caresy is starting"
        >
          <LinearGradient colors={['#FFFFFF', color.bg, '#EEF4EE']} style={StyleSheet.absoluteFill} />
          <Streaks driver={ambient} />
          <Animated.View
            style={{
              // inputRange carries past 1 so the exit tween (logo → 1.08) reads
              // as a real push-through, not a 1% nudge from default extrapolation.
              opacity: logo.interpolate({ inputRange: [0, 1, 1.08], outputRange: [0, 1, 1] }),
              transform: [
                { scale: Animated.multiply(logo.interpolate({ inputRange: [0, 1, 1.08], outputRange: [0.86, 1, 1.14] }), breathe) },
              ],
            }}
          >
            <Image source={LOGO} alt="" style={sp.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
          <Animated.Text
            style={[
              type.label,
              sp.word,
              {
                opacity: text,
                transform: reduce ? [] : [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              },
            ]}
          >
            Care, close to home
          </Animated.Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const sp = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  app: { flex: 1 },
  splash: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg, gap: space.lg },
  streak: { position: 'absolute', opacity: 0.85 },
  // 220 is not decorative: app.json's expo-splash-screen imageWidth is 220
  // with resizeMode 'contain'. Matching it exactly is what makes the native
  // splash and this one the same picture, so the handoff has nothing to reveal.
  logo: { width: 220, height: 220 },
  word: { color: color.muted, letterSpacing: 1.2 },
});
