import { useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { color, radius, space, type } from '../lib/theme';

// Primitives for the admin app. Deliberately small: five components, no theme
// switching, no variant explosion. @caresy/ui is web-only (DOM + CSS tokens),
// so these mirror its vocabulary rather than importing it.

/**
 * A pressable that dips slightly under the finger. iOS users read the scale as
 * "this is a real control"; on a dark ground it also reads better than a
 * highlight colour, which would compete with the urgency signals.
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
    <Pressable
      onPressIn={() => to(0.975)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          ).catch(() => {});
        }
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View
      style={[
        styles.card,
        accent ? { borderColor: accent, backgroundColor: color.surfaceHi } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({ label, tone = 'calm', style }: { label: string; tone?: 'calm' | 'green' | 'amber' | 'red' | 'blue'; style?: StyleProp<ViewStyle> }) {
  const tones = {
    calm: { bg: color.surfaceHi, fg: color.muted },
    green: { bg: color.greenDim, fg: color.green },
    amber: { bg: color.amberDim, fg: color.amber },
    red: { bg: color.terracottaDim, fg: color.terracotta },
    blue: { bg: color.blueDim, fg: color.blue },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg }, style]}>
      <Text style={[type.caption, { color: tones.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Btn({
  label, onPress, tone = 'primary', disabled, style,
}: { label: string; onPress: () => void; tone?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const tones = {
    primary: { bg: color.green, fg: color.onSignal, border: 'transparent' },
    ghost: { bg: 'transparent', fg: color.ink, border: color.lineStrong },
    danger: { bg: color.terracottaDim, fg: color.terracotta, border: 'transparent' },
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
        { backgroundColor: tones.bg, borderColor: tones.border, opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <Text style={[type.h2, { color: tones.fg, textAlign: 'center' }]}>{label}</Text>
    </Touchable>
  );
}

/** iOS-style segmented control: one row, the selected segment lifted. */
export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string; badge?: number }[]; value: T; onChange: (key: T) => void }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[type.label, { color: active ? color.ink : color.muted }]} numberOfLines={1}>
              {o.label}
            </Text>
            {o.badge ? (
              <View style={styles.segmentBadge}>
                <Text style={[type.caption, { color: color.onSignal, fontWeight: '700' }]}>{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: StyleProp<TextStyle> }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: color.muted }]}>{label}</Text>
      <Text style={[type.body, { color: color.ink, flexShrink: 1, textAlign: 'right' }, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    padding: space.lg,
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    // 44pt is Apple's minimum touch target; these are used one-handed.
    minHeight: 48,
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: color.surfacePress },
  segmentBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.lg,
    paddingVertical: 9,
  },
});
