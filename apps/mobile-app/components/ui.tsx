// Native design-system primitives. Every screen composes these instead of
// re-declaring StyleSheets. Haptics, accessibility and pressed-states live here
// so they are consistent and free at the call site.
import { ReactNode } from 'react';
import {
  ActivityIndicator,
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

import { color, radius, shadow, space, type } from '../lib/theme';

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

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        style={({ pressed }) => [s.card, shadow.card, pressed && s.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, shadow.card, style]}>{children}</View>;
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
  const isDisabled = disabled || loading;
  const press = () => {
    if (isDisabled) return;
    Haptics.impactAsync(variant === 'danger' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const fill = variant === 'primary' ? btn.primary : variant === 'danger' ? btn.danger : btn.secondary;
  const txt = variant === 'secondary' ? btn.secondaryText : btn.fillText;
  return (
    <Pressable
      onPress={press}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [btn.base, fill, pressed && !isDisabled && s.pressed, isDisabled && s.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? color.green : color.onGreen} />
      ) : (
        <Text style={[type.title, txt]}>{title}</Text>
      )}
    </Pressable>
  );
}

/* ---------- Chip ---------- */

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [chip.base, selected ? chip.on : chip.off, pressed && s.pressed]}
    >
      <Text style={[type.label, selected ? chip.textOn : chip.textOff]}>{label}</Text>
    </Pressable>
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

export function BottomSheet({ visible, title, options, selectedKey, onSelect, onClose }: {
  visible: boolean; title: string; options: { key: string; label: string; desc?: string }[]; selectedKey: string; onSelect: (key: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={bs.overlay}>
        <Pressable style={bs.backdrop} onPress={onClose} />
        <View style={bs.sheet}>
          <View style={bs.handle} />
          <View style={bs.header}>
            <Txt variant="title" color={color.ink}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={12} style={bs.closeBtn}><Txt variant="label" color={color.muted}>Close</Txt></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={bs.list}>
            {options.map((o) => {
              const on = o.key === selectedKey;
              return (
                <Pressable key={o.key} onPress={() => { Haptics.selectionAsync(); onSelect(o.key); onClose(); }} style={({ pressed }) => [bs.row, on && bs.rowOn, pressed && s.pressed]}>
                  <View style={bs.rowLeft}>
                    <Txt variant="title" color={on ? color.greenDeep : color.ink}>{o.label}</Txt>
                    {o.desc ? <Txt variant="caption" color={color.muted}>{o.desc}</Txt> : null}
                  </View>
                  <View style={[bs.check, on ? bs.checkOn : bs.checkOff]}>
                    {on ? <Txt variant="label" color={color.onGreen}>✓</Txt> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Field ---------- */

export function Field({
  label, value, onChangeText, placeholder, keyboardType, error, autoCapitalize, multiline, onFocus, onBlur,
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
        accessibilityLabel={label}
      />
      {error ? <Text style={[type.caption, { color: color.terracottaDeep }]}>{error}</Text> : null}
    </View>
  );
}

/* ---------- State views (loading / empty / error) ---------- */

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={s.stateWrap}>
      <View style={s.skeletonCard}><View style={s.skelLine} /><View style={[s.skelLine, { width: '72%' }]} /><View style={[s.skelLine, { width: '55%' }]} /></View>
      {label ? <Txt variant="caption" color={color.faint}>{label}</Txt> : null}
      <ActivityIndicator color={color.green} size="small" />
    </View>
  );
}

export function SkeletonRow() {
  return <View style={s.skeletonCard}><View style={s.skelLine} /><View style={[s.skelLine, { width: '68%' }]} /></View>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={s.stateWrap}>
      <View style={s.emptyBadge}><Txt variant="h2" color={color.green}>✦</Txt></View>
      <Txt variant="h2" color={color.ink} style={s.centerText}>{title}</Txt>
      {body ? <Txt variant="body" color={color.muted} style={s.centerText}>{body}</Txt> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.stateWrap}>
      <Txt variant="title" color={color.terracottaDeep} style={s.centerText}>Something went wrong</Txt>
      <Txt variant="body" color={color.muted} style={s.centerText}>{message}</Txt>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={s.retryBtn} /> : null}
    </View>
  );
}

/* ---------- styles ---------- */

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.bg },
  formBody: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,20,0.45)' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: space.sm, paddingBottom: space.xl, maxHeight: '72%' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.line, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.line },
  closeBtn: { paddingVertical: 4, paddingHorizontal: space.sm },
  list: { padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, gap: space.md },
  rowOn: { borderColor: color.green, backgroundColor: color.greenTint },
  rowLeft: { flex: 1, gap: 2 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  checkOff: { borderColor: color.line, backgroundColor: color.surface },
  checkOn: { borderColor: color.green, backgroundColor: color.green },
});
