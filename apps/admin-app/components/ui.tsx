import { useRef } from 'react';
import {
  Animated, Pressable, ScrollView, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { color, radius, shadow, space, type } from '../lib/theme';

// Primitives for the admin app. Deliberately small — @caresy/ui is web-only
// (DOM + CSS tokens), so these mirror its vocabulary rather than importing it.
//
// The rules the whole app follows, kept here so they only exist once:
//   • white cards on a soft ground, lifted with one shadow, no outlines;
//   • one primary action per view, and it is an ink pill;
//   • colour means state — a tint plus its own readable ink, never a bare hue;
//   • icons are drawn from Views. There is no icon font in this app, and an
//     emoji in a dispatch UI reads as a toy.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type Tone = 'neutral' | 'good' | 'warn' | 'critical' | 'info' | 'brand';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: color.neutralTint, fg: color.muted },
  good: { bg: color.goodTint, fg: color.good },
  warn: { bg: color.warnTint, fg: color.warn },
  critical: { bg: color.criticalTint, fg: color.critical },
  info: { bg: color.infoTint, fg: color.info },
  brand: { bg: color.brandTint, fg: color.onBrand },
};

export function toneOf(t: Tone) {
  return TONES[t];
}

/**
 * A pressable that dips under the finger. The scale is what tells a one-handed
 * operator the tap registered, on a screen where the result may be a network
 * round trip away.
 */
export function Touchable({
  children, style, onPress, haptic = 'light', ...rest
}: Omit<PressableProps, 'children' | 'style'> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | null;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, damping: 20, stiffness: 320, mass: 0.7 }).start();

  return (
    <AnimatedPressable
      onPressIn={() => to(0.98)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          ).catch(() => {});
        }
        onPress?.(e);
      }}
      // The style lands on the pressable itself, not on an inner wrapper.
      // Wrapping it used to swallow every layout style a caller passed —
      // `flex: 1` on a tile or a tab, `alignSelf: 'stretch'` on a full-width
      // button — because the flex child of the row was the unstyled Pressable
      // and the flexed View sat inside it. That is why rows of tiles, tab
      // items and button pairs all came out different widths.
      style={[style, { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Card({
  children, style, padded = true,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: space.lg }, style]}>{children}</View>;
}

/** Small state label. Always tint + matching ink, so it reads at arm's length. */
export function Chip({
  label, tone = 'neutral', dot, style,
}: { label: string; tone?: Tone; dot?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }, style]}>
      {dot ? <View style={[styles.chipDot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[type.caption, { color: t.fg, fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Btn({
  label, onPress, tone = 'primary', size = 'md', disabled, full, style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'brand' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tones = {
    primary: { bg: color.ink, fg: color.onInk, border: 'transparent' },
    brand: { bg: color.brand, fg: color.onBrand, border: 'transparent' },
    ghost: { bg: color.surface, fg: color.ink, border: color.lineStrong },
    quiet: { bg: color.surfacePress, fg: color.inkSoft, border: 'transparent' },
    danger: { bg: color.criticalTint, fg: color.critical, border: 'transparent' },
  }[tone];

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.btn,
        size === 'sm' ? styles.btnSm : styles.btnMd,
        { backgroundColor: tones.bg, borderColor: tones.border, opacity: disabled ? 0.38 : 1 },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      <Text
        style={[size === 'sm' ? type.label : type.h2, { color: tones.fg, textAlign: 'center' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Touchable>
  );
}

/**
 * Overview tile: a count, what it counts, and a tint that says how loud it is.
 * Tapping one filters the board — the numbers and the filter are the same
 * control, so there is never a count on screen you cannot open.
 */
export function StatTile({
  value, label, tone = 'neutral', active, onPress,
}: { value: number | string; label: string; tone?: Tone; active?: boolean; onPress: () => void }) {
  const t = TONES[tone];
  return (
    <Touchable
      onPress={onPress}
      style={[styles.tile, { backgroundColor: t.bg }, active && styles.tileActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={`${label}, ${value}`}
    >
      <View style={styles.tileTop}>
        <Text style={[type.stat, { color: active ? color.ink : t.fg }]}>{value}</Text>
        <Chevron color={active ? color.ink : t.fg} />
      </View>
      <Text style={[type.label, { color: active ? color.ink : t.fg, opacity: active ? 1 : 0.85 }]} numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  );
}

/** A chevron drawn from one rotated View — no icon font, no SVG dependency. */
export function Chevron({
  color: c = color.faint, size = 8, direction = 'right',
}: { color?: string; size?: number; direction?: 'right' | 'left' }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: c,
        transform: [{ rotate: direction === 'right' ? '45deg' : '-135deg' }],
      }}
    />
  );
}

export function Avatar({
  text, size = 44, tone = 'brand',
}: { text: string; size?: number; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={[type.h2, { color: t.fg, fontSize: size * 0.36 }]}>{text}</Text>
    </View>
  );
}

/** Label/value line inside a detail card. Renders nothing for an empty value. */
export function Row({
  label, value, valueStyle,
}: { label: string; value: string; valueStyle?: StyleProp<TextStyle> }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: color.muted }]}>{label}</Text>
      <Text style={[type.body, { color: color.ink, flexShrink: 1, textAlign: 'right', fontWeight: '600' }, valueStyle]}>
        {value}
      </Text>
    </View>
  );
}

/** Section heading with an optional count, e.g. "Needs action  5". */
export function SectionTitle({
  title, count, right,
}: { title: string; count?: number; right?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLeft}>
        <Text style={[type.h1, { color: color.ink }]}>{title}</Text>
        {count != null ? (
          <Text style={[type.h1, { color: color.faint }]}>{count}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  btn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 44pt is Apple's minimum target and this app is used one-handed, in a hurry.
  btnMd: { minHeight: 52, paddingVertical: 15, paddingHorizontal: space.xl },
  btnSm: { minHeight: 40, paddingVertical: 9, paddingHorizontal: space.lg },
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    minHeight: 96,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileActive: { borderColor: color.ink },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.lg,
    paddingVertical: 10,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.md,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  pills: { gap: space.sm, paddingVertical: 2, paddingRight: space.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    minHeight: 40,
  },
  pillOn: { backgroundColor: color.ink, borderColor: color.ink },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.lg },
  statBox: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    // Tall enough for a two-line label, so a grid of these keeps one height
    // whether the label wraps or not. Rows of different heights are the thing
    // the eye catches first on a screen of numbers.
    minHeight: 92,
    justifyContent: 'center',
    ...shadow.card,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: space.lg,
  },
  empty: { padding: space.xxl, alignItems: 'center', borderRadius: radius.lg },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    minHeight: 60,
    ...shadow.card,
  },
});

/** Scrolling-row filter pills with counts. The active pill is ink-filled, the
 *  same "one committed thing" rule the primary button follows. */
export function FilterPills<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pills}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Touchable
            key={o.key}
            haptic={null}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(o.key); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.pillOn]}
          >
            <Text style={[type.label, { color: active ? color.onInk : color.inkSoft }]}>{o.label}</Text>
            {o.count ? (
              <Text style={[type.label, { color: active ? color.onInk : color.faint }]}>{o.count}</Text>
            ) : null}
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

/** Large screen title, with the one line that says what the screen is for. */
export function ScreenHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[type.display, { color: color.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.body, { color: color.muted, marginTop: 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/**
 * A number and what it counts. Three across, or two — it flexes.
 *
 * One fixed size, never auto-shrunk: `adjustsFontSizeToFit` let each box in a
 * row settle on its own font size, so three figures side by side came out at
 * three different heights. Equal `minHeight` and a shared baseline are what
 * make a row of these read as one instrument rather than three stickers.
 */
export function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text
        style={[type.stat, { color: color.ink, fontSize: 19, lineHeight: 24, letterSpacing: -0.5 }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[type.caption, { color: color.muted }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

/**
 * The "‹ back" affordance on a pushed screen. Was hand-rolled identically on
 * three screens with three different paddings; one primitive keeps the title
 * underneath it on the same baseline everywhere.
 */
export function BackLink({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} style={styles.back} accessibilityRole="button" accessibilityLabel={`Back to ${label}`}>
      <Chevron direction="left" color={color.inkSoft} />
      <Text style={[type.label, { color: color.inkSoft }]}>{label}</Text>
    </Touchable>
  );
}

/** Centred "nothing to do here" state. Empty is a result, not a blank screen. */
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card style={styles.empty}>
      <Text style={[type.h2, { color: color.ink }]}>{title}</Text>
      {hint ? (
        <Text style={[type.body, { color: color.muted, textAlign: 'center', marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </Card>
  );
}

/** Tappable settings-style row: label, optional value, chevron. */
export function LinkRow({
  label, value, onPress,
}: { label: string; value?: string; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.linkRow}>
      <Text style={[type.h2, { color: color.ink, flex: 1 }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={[type.body, { color: color.muted }]} numberOfLines={1}>{value}</Text> : null}
      <Chevron />
    </Touchable>
  );
}
