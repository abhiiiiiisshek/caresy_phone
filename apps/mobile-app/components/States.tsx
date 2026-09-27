// Network, empty, error and success states.
//
// Every one of these used to be either a blank screen or a line of grey text.
// They are the moments a product feels cheapest, because they are the moments
// something went wrong — so they get the most care here: an animated glyph that
// carries the mood, one sentence of plain language, and exactly one action.
//
// The glyphs are drawn with views and transforms rather than Lottie. A Lottie
// file is a native dependency plus a JSON asset per state; three circles and a
// spring buy the same 60 FPS reveal for nothing. See the note at the bottom.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, space, type } from '../lib/theme';
import { useEnter, usePressScale, useReduceMotion, useSpin } from '../lib/motion';
import { useNetStatus, type NetStatus } from '../lib/network';

/* ---------- Animated glyphs ---------- */

// Pulsing halo behind a glyph — one native loop, two interpolations. Conveys
// "still working" without the mechanical rotation of a spinner.
function Pulse({ tint, children }: { tint: string; children: ReactNode }) {
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [a, reduce]);
  return (
    <View style={st.glyphWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          st.halo,
          {
            backgroundColor: tint,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] }) }],
          },
        ]}
      />
      <View style={[st.glyph, { backgroundColor: tint }]}>{children}</View>
    </View>
  );
}

// The success mark. Spring-scales in with overshoot, then the tick strokes draw
// out. Overshoot is what makes a confirmation feel earned instead of announced.
export function SuccessMark({ size = 84, tint = color.success, onDone }: { size?: number; tint?: string; onDone?: () => void }) {
  const reduce = useReduceMotion();
  const pop = useState(() => new Animated.Value(0))[0];
  const draw = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, damping: reduce ? 30 : 11, stiffness: 180, mass: 1, useNativeDriver: true }),
      Animated.timing(draw, { toValue: 1, duration: reduce ? 120 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDone?.(); });
  }, [pop, draw, reduce, onDone]);

  const short = size * 0.22;
  const long = size * 0.42;
  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel="Success"
      style={[
        st.mark,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tint },
        { opacity: pop, transform: [{ scale: pop }] },
      ]}
    >
      {/* Two rotated bars scaling out from the elbow read as a stroked tick.
          scaleX is compositor-only; animating width would relayout per frame. */}
      <Animated.View
        style={[st.stroke, { width: short, left: size * 0.26, top: size * 0.52, transform: [{ rotate: '45deg' }, { scaleX: draw }] }]}
      />
      <Animated.View
        style={[st.stroke, { width: long, left: size * 0.36, top: size * 0.45, transform: [{ rotate: '-45deg' }, { scaleX: draw }] }]}
      />
    </Animated.View>
  );
}

// Confetti. Deliberately rare — reserved for a completed booking or payment,
// never for a saved field. Celebration that happens for everything stops
// meaning anything, and on a healthcare app it starts reading as flippant.
export function Confetti({ count = 14, run = true }: { count?: number; run?: boolean }) {
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];
  const pieces = useState(() => Array.from({ length: count }, (_, i) => ({
    x: (i / count) * 320 - 160 + (i % 3) * 18,
    tint: [color.green, color.greenSoft, color.success, color.warning, color.terracotta][i % 5],
    spin: i % 2 ? '360deg' : '-360deg',
  })))[0];

  useEffect(() => {
    if (!run || reduce) return; // Reduce Motion: no confetti at all, by design
    Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a, run, reduce]);

  if (!run || reduce) return null;
  return (
    <View pointerEvents="none" style={st.confetti} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            st.piece,
            {
              backgroundColor: p.tint,
              opacity: a.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                { translateY: a.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -120, 260] }) },
                { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.spin] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ---------- Network banner ---------- */

const NET_COPY: Record<Exclude<NetStatus, 'online'>, { text: string; bg: string; fg: string }> = {
  offline: { text: "You're offline — we'll reconnect automatically", bg: color.urgentBg, fg: color.urgentInk },
  slow: { text: 'Slow connection — this may take a moment', bg: color.chip, fg: color.muted },
};

// Slides down from under the status bar and holds. Not a toast: a connectivity
// problem is a condition, not an event, so it stays until the condition ends.
export function NetBanner() {
  const net = useNetStatus();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const y = useState(() => new Animated.Value(-1))[0];
  const visible = net !== 'online';

  useEffect(() => {
    Animated.spring(y, { toValue: visible ? 0 : -1, damping: 20, stiffness: 220, mass: 1, useNativeDriver: true }).start();
  }, [visible, y]);

  const copy = visible ? NET_COPY[net as Exclude<NetStatus, 'online'>] : null;
  if (!copy) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        st.banner,
        shadow.card,
        { top: insets.top + space.sm, backgroundColor: copy.bg },
        {
          opacity: y.interpolate({ inputRange: [-1, 0], outputRange: [0, 1] }),
          transform: reduce ? [] : [{ translateY: y.interpolate({ inputRange: [-1, 0], outputRange: [-64, 0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.Text style={[type.label, { color: copy.fg }]} numberOfLines={2}>{copy.text}</Animated.Text>
    </Animated.View>
  );
}

/* ---------- Full-screen states ---------- */

function StateShell({ children }: { children: ReactNode }) {
  const enter = useEnter({ distance: 10 });
  return <Animated.View style={[st.shell, enter]}>{children}</Animated.View>;
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateShell>
      <Pulse tint={color.urgentBg}>
        <Animated.Text style={[type.h1, { color: color.urgentInk }]}>⌁</Animated.Text>
      </Pulse>
      <Animated.Text style={[type.h2, st.center, { color: color.ink }]}>No connection</Animated.Text>
      <Animated.Text style={[type.body, st.center, { color: color.muted }]}>
        We&apos;ll pick up where you left off the moment you&apos;re back online.
      </Animated.Text>
      {onRetry ? <RetryButton onPress={onRetry} /> : null}
    </StateShell>
  );
}

export function SlowState({ label = 'Still working on it' }: { label?: string }) {
  const spin = useSpin();
  return (
    <StateShell>
      <View style={st.glyphWrap}>
        <Animated.View style={[st.ring, { transform: [{ rotate: spin }] }]}>
          <LinearGradient
            colors={[color.green, 'rgba(27,77,62,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.ringFill}
          />
        </Animated.View>
      </View>
      <Animated.Text style={[type.h2, st.center, { color: color.ink }]}>{label}</Animated.Text>
      <Animated.Text style={[type.body, st.center, { color: color.muted }]}>
        Your connection is slow right now — nothing is lost.
      </Animated.Text>
    </StateShell>
  );
}

// Retry gets its own button so every retry in the app is the same affordance,
// with the same press spring and the same haptic.
export function RetryButton({ onPress, title = 'Try again' }: { onPress: () => void; title?: string }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.95);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
        accessibilityRole="button"
        style={st.retry}
      >
        <Animated.Text style={[type.title, { color: color.green }]}>{title}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/* ---------- Toast ---------- */

// Transient confirmations. Springs up from the bottom, holds 2.4s, springs out.
// Lives above the safe area so it never collides with a home indicator.
export function Toast({ message, tone = 'info', onHide }: { message: string | null; tone?: 'info' | 'success' | 'error'; onHide?: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!message) return;
    Animated.spring(a, { toValue: 1, damping: 18, stiffness: 240, mass: 1, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: reduce ? 120 : 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(() => onHide?.());
    }, 2400);
    return () => clearTimeout(t);
  }, [message, a, reduce, onHide]);

  if (!message) return null;
  const bg = tone === 'error' ? color.urgentBg : tone === 'success' ? color.successSoft : color.surface;
  const fg = tone === 'error' ? color.urgentInk : tone === 'success' ? color.greenDeep : color.ink;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        st.toast,
        shadow.overlay,
        { bottom: insets.bottom + space.xl, backgroundColor: bg },
        {
          opacity: a,
          transform: reduce ? [] : [
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.Text style={[type.label, { color: fg }]} numberOfLines={2}>{message}</Animated.Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  shell: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  center: { textAlign: 'center' },
  glyphWrap: { alignItems: 'center', justifyContent: 'center', width: 96, height: 96 },
  halo: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  glyph: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center' },
  stroke: { position: 'absolute', height: 5, borderRadius: 3, backgroundColor: color.onGreen },
  ring: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  ringFill: { flex: 1, borderRadius: 28 },
  confetti: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute', width: 8, height: 12, borderRadius: 2 },
  banner: {
    position: 'absolute', left: space.lg, right: space.lg, zIndex: 50,
    paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center',
  },
  toast: {
    position: 'absolute', left: space.xl, right: space.xl, zIndex: 60,
    paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center',
  },
  retry: { marginTop: space.sm, paddingVertical: space.md, paddingHorizontal: space.xl, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.green },
});
