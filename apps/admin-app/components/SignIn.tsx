import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../lib/auth';
import { color, radius, space, type } from '../lib/theme';
import { Avatar, Btn, Card } from './ui';

export function SignIn({ notAdmin = false }: { notAdmin?: boolean }) {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const insets = useSafeAreaInsets();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (notAdmin) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Card style={styles.card}>
          <Avatar text="CA" size={52} />
          <Text style={[type.h1, { color: color.ink, marginTop: space.lg }]}>Not an ops account</Text>
          <Text style={[type.body, { color: color.muted, marginTop: space.sm }]}>
            This app is the Caresy dispatch desk. Sign in with an account on the
            admin allowlist.
          </Text>
          <Btn label="Sign out" tone="ghost" onPress={() => signOut()} full style={{ marginTop: space.xl }} />
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.center, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Avatar text="CA" size={56} />
        <Text style={[type.display, { color: color.ink, marginTop: space.lg }]}>Dispatch</Text>
        <Text style={[type.body, { color: color.muted, marginTop: space.xs, marginBottom: space.xl }]}>
          Sign in to work the desk.
        </Text>

        <Card style={styles.card}>
          <Text style={[type.overline, { color: color.muted }]}>Email</Text>
          <TextInput
            style={[styles.input, focused === 'email' && styles.inputOn]}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            placeholder="you@caresy.co.in"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel="Email"
          />

          <Text style={[type.overline, { color: color.muted, marginTop: space.lg }]}>Password</Text>
          <TextInput
            style={[styles.input, focused === 'password' && styles.inputOn]}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            placeholder="••••••••"
            placeholderTextColor={color.faint}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={submit}
            returnKeyType="go"
            accessibilityLabel="Password"
          />

          {error ? (
            <Text style={[type.body, { color: color.critical, marginTop: space.md }]}>{error}</Text>
          ) : null}

          <Btn
            label={busy ? 'Signing in…' : 'Sign in'}
            onPress={submit}
            disabled={busy || !email.trim() || !password}
            full
            style={{ marginTop: space.lg }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.lg },
  card: { width: '100%', maxWidth: 420, padding: space.xl, alignSelf: 'center' },
  input: {
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    marginTop: space.sm,
    color: color.ink,
    fontSize: 16,
  },
  inputOn: { borderColor: color.ink, backgroundColor: color.surface },
});
