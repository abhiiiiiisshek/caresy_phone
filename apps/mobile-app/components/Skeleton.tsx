// Skeletons — the replacement for every spinner that used to stand in for
// content. A spinner says "wait"; a skeleton says "here is what is coming and
// where it will sit", so when the real content lands nothing jumps. Each
// skeleton below is laid out to the same metrics as the component it stands in
// for, which is the whole point: zero layout shift on swap.
import { memo, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { color, radius, space } from '../lib/theme';
import { useEnter, useShimmer, staggerDelay, useReduceMotion } from '../lib/motion';

/* ---------- Shimmer ---------- */

// One highlight band sweeping across a clipped container. The band is a
// transform-only animation over a static gradient, so the sweep costs nothing
// per frame beyond a composited translate — no re-render, no layout.
export const Shimmer = memo(function Shimmer({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { onLayout, width, translateX } = useShimmer();
  return (
    <View onLayout={onLayout} style={[sk.clip, style]}>
      {children}
      {width > 0 ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

/* ---------- Primitives ---------- */

// A single grey block. `w`/`h` mirror the real element's box so the skeleton is
// a tracing of the content, not a generic grey slab.
export function SkelBlock({ w = '100%', h = 12, r = 6, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: color.card }, style]} />;
}

// Paragraph stand-in. The last line is deliberately short — real prose rarely
// fills its final line, and matching that is what stops a skeleton reading as
// a placeholder rectangle.
export function SkelText({ lines = 3, gap = space.sm }: { lines?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkelBlock key={i} h={12} w={i === lines - 1 ? '58%' : i % 2 ? '86%' : '100%'} />
      ))}
    </View>
  );
}

/* ---------- Card / list skeletons ---------- */

// Shaped like <Card> in components/ui.tsx: same radius, padding and surface, so
// the swap to real content is a cross-fade in place rather than a reflow.
export function SkelCard({ lines = 2, withAvatar = false, index = 0 }: { lines?: number; withAvatar?: boolean; index?: number }) {
  const reduce = useReduceMotion();
  const enter = useEnter({ delay: staggerDelay(index, reduce) });
  return (
    <Animated.View style={[sk.card, enter]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Shimmer style={sk.cardInner}>
        {withAvatar ? (
          <View style={sk.row}>
            <SkelBlock w={44} h={44} r={22} />
            <View style={sk.rowBody}>
              <SkelBlock h={14} w="62%" />
              <SkelBlock h={11} w="40%" />
            </View>
          </View>
        ) : null}
        <SkelText lines={lines} />
      </Shimmer>
    </Animated.View>
  );
}

// Staggered skeleton list. `count` should match the page size you actually
// fetch — promising six rows and delivering two is its own small lie.
export function SkelList({ count = 4, lines = 2, withAvatar = false }: { count?: number; lines?: number; withAvatar?: boolean }) {
  return (
    <View style={sk.list} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkelCard key={i} index={i} lines={lines} withAvatar={withAvatar} />
      ))}
    </View>
  );
}

// Home/detail screen shape: a title block, a hero card, then two rows. Screens
// gate on this instead of a centred spinner so the first painted frame already
// has the page's silhouette.
export function SkelScreen({ hero = true, rows = 3 }: { hero?: boolean; rows?: number }) {
  const enter = useEnter({ delay: 0 });
  return (
    <View style={sk.screen} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Animated.View style={enter}>
        <Shimmer style={sk.bare}>
          <SkelBlock h={22} w="52%" r={8} />
          <SkelBlock h={13} w="34%" />
        </Shimmer>
      </Animated.View>
      {hero ? <SkelCard index={1} lines={2} /> : null}
      {Array.from({ length: rows }, (_, i) => <SkelCard key={i} index={i + 2} lines={1} />)}
    </View>
  );
}

const sk = StyleSheet.create({
  clip: { overflow: 'hidden' },
  screen: { padding: space.xl, gap: space.lg },
  list: { gap: space.md },
  bare: { gap: space.sm, borderRadius: radius.sm },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  cardInner: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowBody: { flex: 1, gap: space.sm },
});
