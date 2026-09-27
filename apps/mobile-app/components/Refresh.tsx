// Pull-to-refresh and infinite-scroll indicators.
//
// The gesture itself stays on RefreshControl: it is the platform's own, it
// handles overscroll physics, VoiceOver's "refresh" action and the Android
// nested-scroll contract — all things a hand-rolled gesture would have to
// re-earn. What we replace is what it *looks* like.
//
// ponytail: RefreshControl's own indicator can only be tinted, not replaced.
// A fully custom pull (rubber-band, liquid blob tracking the finger) needs
// react-native-gesture-handler + reanimated, because Android reports no
// overscroll offset to JS. If that becomes worth a native rebuild, swap this
// file for a Reanimated `useAnimatedScrollHandler` and keep the call sites.
import { useEffect, useState } from 'react';
import { Animated, Easing, RefreshControl, StyleSheet, View } from 'react-native';

import { color, space, type } from '../lib/theme';
import { useReduceMotion } from '../lib/motion';

// Brand-tinted platform control. On Android this is what stops the generic
// grey Material circle: our green on our surface.
export function BrandRefresh({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={color.green}
      colors={[color.green, color.greenSoft]}
      progressBackgroundColor={color.surface}
      progressViewOffset={8}
    />
  );
}

// Three dots that swell and settle in sequence — the "liquid" read comes from
// overlapping phases, so the row never looks like three separate timers. Shown
// while a refresh or a page-fetch is in flight; it is an overlay, so it adds no
// height and the list never jumps.
export function LiquidDots({ active, label }: { active: boolean; label?: string }) {
  const reduce = useReduceMotion();
  const a = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (!active || reduce) return;
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => { loop.stop(); a.setValue(0); };
  }, [active, reduce, a, fade]);

  return (
    <Animated.View style={[rf.wrap, { opacity: fade }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={rf.dots}>
        {[0, 1, 2].map((i) => {
          // Each dot's phase is offset by a third of the cycle. inputRange wraps
          // past 1 so the sequence is continuous instead of restarting in step.
          const phase = i / 3;
          return (
            <Animated.View
              key={i}
              style={[
                rf.dot,
                {
                  transform: [
                    {
                      scale: a.interpolate({
                        inputRange: [0, phase, Math.min(phase + 0.25, 1), 1],
                        outputRange: [0.7, 0.7, 1.25, 0.7],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                  opacity: a.interpolate({
                    inputRange: [0, phase, Math.min(phase + 0.25, 1), 1],
                    outputRange: [0.45, 0.45, 1, 0.45],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          );
        })}
      </View>
      {label ? <Animated.Text style={[type.caption, rf.label]}>{label}</Animated.Text> : null}
    </Animated.View>
  );
}

// Footer for infinite scroll. Occupies its height only while fetching, so the
// list does not carry permanent dead space at the bottom.
export function LoadMoreFooter({ loading, done }: { loading: boolean; done?: boolean }) {
  if (done) return null;
  if (!loading) return <View style={rf.footerSpacer} />;
  return (
    <View style={rf.footer}>
      <LiquidDots active label="Loading more" />
    </View>
  );
}

const rf = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  dots: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.green },
  label: { color: color.faint },
  footer: { paddingVertical: space.lg, alignItems: 'center' },
  footerSpacer: { height: space.xl },
});
