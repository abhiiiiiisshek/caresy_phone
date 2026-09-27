// Native design-system primitives. Every screen composes these instead of
// re-declaring StyleSheets. Haptics, accessibility and pressed-states live here
// so they are consistent and free at the call site.
import { ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';

import { color, material, radius, shadow, space, type } from '../lib/theme';
import { staggerDelay, useEnter, usePressScale, useReduceMotion, useSettledLoading, useSpin } from '../lib/motion';
import { SkelCard, SkelList, SkelScreen } from './Skeleton';
import { Confetti, OfflineState, RetryButton, SuccessMark } from './States';
import { useNetStatus } from '../lib/network';

/* ---------- Stagger ---------- */

// Entrance animation for list/section children. `index` sets the cadence
// (56ms apart) so a screen's content arrives in sequence instead of at once.
export function Stagger({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const enter = useEnter({ delay: staggerDelay(index, reduce) });
  // Default gap so multi-field steps get consistent, deterministic spacing
  // instead of relying on incidental spacing from child components.
  return <Animated.View style={[s.staggerGap, style, enter]}>{children}</Animated.View>;
}

/* ---------- Screen ---------- */

export function Screen({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[s.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

// Screen wrapper for forms: keeps inputs above the keyboard, scrolls, dismisses
// the keyboard on tap outside a field.
export function FormScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <View style={s.screen}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.formBody}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- SuccessScreen ---------- */

// ONE shared completion screen for every flow that ends in a submit (quick
// help, booking). A bare unstyled <View> here previously left the checkmark,
// text and buttons crammed top-left with zero padding or gap — this is the
// fix, plus haptic + a bouncy pop-in on the checkmark instead of a static one.
export function SuccessScreen({
  headerTitle, title, body, refCode, refLabel = 'Reference', primaryAction, secondaryAction, celebrate = false,
}: {
  headerTitle?: string;
  title: string;
  body: string;
  refCode?: string;
  refLabel?: string;
  primaryAction: { title: string; onPress: () => void };
  secondaryAction?: { title: string; onPress: () => void };
  // Opt-in, and only for the outcomes that deserve it — a confirmed booking or
  // a completed payment. Confetti on "profile updated" is noise, and on a
  // healthcare app it reads as flippant.
  celebrate?: boolean;
}) {
  return (
    <Screen>
      {headerTitle ? <Stack.Screen options={{ headerShown: true, title: headerTitle, headerBackVisible: false }} /> : null}
      <View style={s.successWrap}>
        {celebrate ? <Confetti /> : null}
        <SuccessMark />
        <Stagger index={1} style={s.successText}>
          <Txt variant="h1" color={color.greenDeep} style={s.centerText}>{title}</Txt>
          <Txt variant="body" color={color.muted} style={s.centerText}>{body}</Txt>
        </Stagger>
        {refCode ? (
          <Stagger index={2}>
            <View style={s.refBadge}><Txt variant="label" color={color.greenDeep}>{refLabel} {refCode}</Txt></View>
          </Stagger>
        ) : null}
        <Stagger index={3} style={s.successActions}>
          <Button title={primaryAction.title} onPress={primaryAction.onPress} style={s.successBtn} />
          {secondaryAction ? <Button title={secondaryAction.title} variant="secondary" onPress={secondaryAction.onPress} style={s.successBtn} /> : null}
        </Stagger>
      </View>
    </Screen>
  );
}

/* ---------- Text ---------- */

type Variant = keyof typeof type;
export function Txt({
  variant = 'body', color: c = color.ink, style, children, numberOfLines,
}: {
  variant?: Variant; color?: string; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number;
}) {
  return <Text numberOfLines={numberOfLines} style={[type[variant], { color: c }, style]}>{children}</Text>;
}

export function Overline({ children, color: c = color.green }: { children: ReactNode; color?: string }) {
  return <Text style={[type.overline, { color: c }]}>{children}</Text>;
}

/* ---------- Card ---------- */

export function Card({ children, style, onPress, level = 'card' }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; level?: 'card' | 'raised' | 'overlay' }) {
  const sh = level === 'overlay' ? shadow.overlay : level === 'raised' ? shadow.raised : shadow.card;
  // Hooks run unconditionally — the tappable/static branch is in the render,
  // never in the hook order.
  const { scale, onPressIn, onPressOut } = usePressScale(0.975);
  if (onPress) {
    return (
      // The spring lives on the wrapper so the card's own shadow scales with
      // it: a flat opacity change reads as a state toggle, a scale + shadow
      // reads as the surface physically taking the press.
      <Animated.View style={[{ transform: [{ scale }] }, sh, s.cardShadowHost, style]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
          android_ripple={null}
          accessibilityRole="button"
          style={s.card}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }
  return <View style={[s.card, sh, style]}>{children}</View>;
}

/* ---------- Button ---------- */

export function Button({
  title, onPress, variant = 'primary', loading, disabled, style, accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const reduce = useReduceMotion();
  const isDisabled = disabled || loading;
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  const spin = useSpin(!!loading);

  // The morph. `morph` drives one value: 0 = pill with a label, 1 = circle with
  // a spinning ring. The fill is a separate absolutely-positioned layer that is
  // scaled on X from full width down to its own height, so the pill collapses
  // into a circle WITHOUT animating `width` — no layout pass per frame, so this
  // holds 60 FPS even while the submit request is saturating the JS thread,
  // which is exactly when it is on screen.
  const morph = useState(() => new Animated.Value(0))[0];
  const [w, setW] = useState(0);
  const H = 52;

  useEffect(() => {
    Animated.spring(morph, {
      toValue: loading ? 1 : 0,
      damping: reduce ? 40 : 18,
      stiffness: 220,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [loading, morph, reduce]);

  const collapse = w > 0 ? H / w : 1;
  const press = () => {
    if (isDisabled) return;
    Haptics.impactAsync(variant === 'danger' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };
  const fill = variant === 'primary' ? btn.primary : variant === 'danger' ? btn.danger : btn.secondary;
  const txt = variant === 'secondary' ? btn.secondaryText : btn.fillText;
  const ink = variant === 'secondary' ? color.green : color.onGreen;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={press}
        disabled={isDisabled}
        android_ripple={null}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: !!loading }}
        accessibilityHint={accessibilityHint}
        style={[btn.hit, isDisabled && !loading && s.disabled]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            fill,
            btn.fillLayer,
            { transform: [{ scaleX: morph.interpolate({ inputRange: [0, 1], outputRange: [1, collapse] }) }] },
          ]}
        />
        {/* Label and ring cross-fade over the collapsing fill. The label also
            scales down slightly so it appears to be absorbed, not switched. */}
        <Animated.Text
          style={[
            type.title, txt, btn.label,
            {
              opacity: morph.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }),
              transform: [{ scale: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }],
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
        <Animated.View
          pointerEvents="none"
          style={[
            btn.ring,
            { borderColor: ink, borderTopColor: 'transparent' },
            {
              opacity: morph.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [{ rotate: spin }],
            },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

/* ---------- Chip ---------- */

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
        android_ripple={null}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[chip.base, selected ? chip.on : chip.off]}
      >
        <Text style={[type.label, selected ? chip.textOn : chip.textOff]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={s.chipRow}>{children}</View>;
}

export function FieldButton({ label, value, placeholder, onPress, error }: { label: string; value: string; placeholder?: string; onPress: () => void; error?: string | null }) {
  return (
    <View style={s.field}>
      <Text style={[type.label, { color: color.muted }]}>{label}</Text>
      <Pressable onPress={() => { Haptics.selectionAsync(); onPress(); }} style={({ pressed }) => [s.input, s.inputButton, error ? s.inputError : null, pressed && s.pressed]}>
        <Text style={[type.body, { color: value ? color.ink : color.placeholder }]} numberOfLines={1}>{value || placeholder || 'Select'}</Text>
        <Text style={[type.label, { color: color.muted }]}>⌄</Text>
      </Pressable>
      {error ? <Text style={[type.caption, { color: color.terracottaDeep }]}>{error}</Text> : null}
    </View>
  );
}

// ── Reusable bottom-sheet picker ──
// ONE component for every single-select picker in booking (family/patient,
// date, time, service, transport). Callers pass FieldButton → PickerSheet.
// Replaces the Chip/ChipRow pattern for pickers (see booking.tsx steps 3/4).
export function BottomSheet({ visible, title, options, selectedKey, onSelect, onClose }: {
  visible: boolean; title: string; options: { key: string; label: string; desc?: string }[]; selectedKey: string | null; onSelect: (key: string) => void; onClose: () => void;
}) {
  const reduce = useReduceMotion();
  // Modal's own `animationType="slide"` is a fixed linear tween we cannot tune
  // and cannot interrupt. Driving the sheet ourselves (Modal set to "none")
  // buys a spring with real overshoot, and lets the backdrop fade on its own
  // curve — the backdrop should be most of the way opaque before the sheet has
  // finished arriving, or the sheet appears to drag the dark with it.
  const a = useState(() => new Animated.Value(0))[0];
  // `lingering` is set only from the spring's completion callback, never
  // synchronously during render or an effect body: opening needs no state at
  // all (visible alone mounts the Modal), and closing keeps the Modal mounted
  // until the exit spring has actually finished so it is seen, not cut.
  const [lingering, setLingering] = useState(false);

  useEffect(() => {
    Animated.spring(a, {
      toValue: visible ? 1 : 0,
      damping: reduce ? 40 : 22,
      stiffness: 260,
      mass: 1,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setLingering(visible); });
  }, [visible, a, reduce]);

  if (!visible && !lingering) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={bs.overlay}>
        {/* Scrim: a layered dark wash plus a soft gradient at the sheet's lip.
            expo-blur is not installed and a real backdrop blur is a native
            dependency; this reads as depth at a fraction of the cost. */}
        <Animated.View style={[StyleSheet.absoluteFill, bs.scrim, { opacity: a }]} pointerEvents="none">
          <LinearGradient colors={['rgba(16,24,20,0.10)', 'rgba(16,24,20,0.55)']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Pressable style={bs.backdrop} onPress={onClose} accessibilityLabel="Dismiss sheet" />
        <Animated.View
          style={[
            bs.sheet,
            shadow.overlay,
            {
              opacity: reduce ? a : 1,
              transform: reduce ? [] : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }],
            },
          ]}
        >
          <View style={bs.handle} accessibilityElementsHidden importantForAccessibility="no" />
          <View style={bs.header}>
            <Txt variant="title" color={color.ink}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={12} style={bs.closeBtn}><Txt variant="label" color={color.muted}>Close</Txt></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={bs.list} keyboardShouldPersistTaps="handled">
            {options.map((o, i) => {
              const on = o.key === selectedKey;
              return (
                <Stagger key={o.key} index={i} style={bs.rowGap}>
                  <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onSelect(o.key); onClose(); }} style={({ pressed }) => [bs.row, on && bs.rowOn, pressed && s.pressedCard]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <View style={bs.rowLeft}>
                      <Txt variant="title" color={on ? color.greenDeep : color.ink}>{o.label}</Txt>
                      {o.desc ? <Txt variant="caption" color={color.muted}>{o.desc}</Txt> : null}
                    </View>
                    {on ? (
                      <View style={bs.check}>
                        <Txt variant="label" color={color.onGreen}>✓</Txt>
                      </View>
                    ) : null}
                  </Pressable>
                </Stagger>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Alias so call sites can read as a picker primitive; BottomSheet remains for
// backwards compat. Both names resolve to the same ONE reusable component.
export const PickerSheet = BottomSheet;

/* ---------- Field ---------- */

export function Field({
  label, value, onChangeText, placeholder, keyboardType, error, autoCapitalize, multiline, onFocus, onBlur, secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  error?: string | null;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  multiline?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={[type.label, { color: color.muted }]}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline, error ? s.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? (keyboardType === 'email-address' ? 'none' : 'sentences')}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
        accessibilityLabel={label}
      />
      {error ? <Text style={[type.caption, { color: color.terracottaDeep }]}>{error}</Text> : null}
    </View>
  );
}

/* ---------- State views (loading / empty / error) ---------- */

// The old LoadingState was a spinner under a grey block. It is now a tracing of
// the page that is coming: `shape` picks the silhouette, so a list screen waits
// as a list and a detail screen waits as a detail page. Nothing jumps on swap.
export function LoadingState({ label, shape = 'screen', count = 4 }: { label?: string; shape?: 'screen' | 'list' | 'card'; count?: number }) {
  return (
    <View style={s.loadingWrap} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      {shape === 'list' ? <SkelList count={count} /> : shape === 'card' ? <SkelCard /> : <SkelScreen />}
    </View>
  );
}

export function SkeletonRow() {
  return <SkelCard lines={2} />;
}

// Re-exported so screens import their loading shapes from one place.
export { SkelCard, SkelList, SkelScreen } from './Skeleton';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const enter = useEnter({ distance: 10 });
  const float = useState(() => new Animated.Value(0))[0];
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    // A 3s drift, 6px of travel. Slow enough to read as ambient rather than as
    // an animation demanding attention — an empty state should feel calm, not
    // busy, because nothing is wrong.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [float, reduce]);

  return (
    <Animated.View style={[s.stateWrap, enter]}>
      <Animated.View
        style={[
          s.emptyBadge,
          { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
        ]}
      >
        <Txt variant="h2" color={color.green}>✦</Txt>
      </Animated.View>
      <Txt variant="h2" color={color.ink} style={s.centerText}>{title}</Txt>
      {body ? <Txt variant="body" color={color.muted} style={s.centerText}>{body}</Txt> : null}
      {action}
    </Animated.View>
  );
}

// Error states now know why they failed. A dropped connection is not the app's
// fault and must not read like one — so when the link is down we show the
// offline state, which promises recovery, instead of "something went wrong",
// which asks the user to doubt their data.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const net = useNetStatus();
  const enter = useEnter({ distance: 10 });
  if (net === 'offline') return <OfflineState onRetry={onRetry} />;
  return (
    <Animated.View style={[s.stateWrap, enter]}>
      <Txt variant="title" color={color.terracottaDeep} style={s.centerText}>Something went wrong</Txt>
      <Txt variant="body" color={color.muted} style={s.centerText}>{message}</Txt>
      {onRetry ? <RetryButton onPress={onRetry} /> : null}
    </Animated.View>
  );
}

// Wraps any async region: skeleton while loading, error state on failure,
// content otherwise — with a floor on the skeleton so a 90ms response does not
// flash one. One component means no screen can forget a state.
export function AsyncBoundary({
  loading, error, onRetry, shape = 'list', count = 4, children,
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  shape?: 'screen' | 'list' | 'card';
  count?: number;
  children: ReactNode;
}) {
  const held = useSettledLoading(loading);
  if (held) return <LoadingState shape={shape} count={count} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}

/* ---------- styles ---------- */

const s = StyleSheet.create({
  flex: { flex: 1 },
  staggerGap: { gap: space.lg },
  screen: { flex: 1, backgroundColor: color.bg },
  formBody: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  successText: { gap: space.xs, alignItems: 'center' },
  successActions: { alignSelf: 'stretch', gap: space.md, marginTop: space.md },
  successBtn: { alignSelf: 'stretch' },
  tick: { width: 84, height: 84, borderRadius: radius.pill, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center' },
  refBadge: { backgroundColor: color.greenTint, paddingVertical: space.sm, paddingHorizontal: space.xl, borderRadius: radius.pill },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg },
  cardShadowHost: { borderRadius: radius.lg, backgroundColor: color.surface },
  loadingWrap: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] }, // legacy — prefer pressedCard
  pressedCard: { opacity: 0.97, transform: [{ scale: 0.97 }] }, // §1: 100ms scale 0.97, compositor-only §11
  disabled: { opacity: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: { gap: space.xs },
  input: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: 15, color: color.ink,
  },
  inputButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: color.terracotta },
  stateWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centerText: { textAlign: 'center' },
  retryBtn: { marginTop: space.sm, paddingHorizontal: space.xl },
  skeletonCard: { width: '100%', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: color.line },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: '#E8EDE9', width: '100%' },
  emptyBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.greenTint, alignItems: 'center', justifyContent: 'center' },
});

const btn = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, flexDirection: 'row' },
  // The press target keeps its full width for the whole morph, so the button
  // never moves under the finger even as the fill collapses to a circle.
  hit: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, flexDirection: 'row', overflow: 'hidden' },
  fillLayer: { borderRadius: radius.pill },
  label: { textAlign: 'center' },
  ring: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2.5 },
  primary: { backgroundColor: color.green },
  danger: { backgroundColor: color.terracotta },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color.green },
  fillText: { color: color.onGreen },
  secondaryText: { color: color.green },
});

const chip = StyleSheet.create({
  base: { minHeight: 40, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  off: { backgroundColor: color.chip, borderWidth: 1, borderColor: color.line },
  on: { backgroundColor: color.green, borderWidth: 1, borderColor: color.green },
  textOff: { color: color.muted },
  textOn: { color: color.onGreen },
});

const bs = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: material.scrim },
  rowGap: { gap: 0 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: space.sm, paddingBottom: space.xl, maxHeight: '72%' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.line, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.line },
  closeBtn: { paddingVertical: 4, paddingHorizontal: space.sm },
  list: { paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md, borderBottomWidth: 1, borderBottomColor: color.line, gap: space.md },
  rowOn: { borderBottomColor: 'transparent', backgroundColor: color.greenTint },
  rowLeft: { flex: 1, gap: 2 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.green },
});
