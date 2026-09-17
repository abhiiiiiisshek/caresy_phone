import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../lib/auth';
import { color, radius, space, type } from '../lib/theme';
import { Btn } from './ui';

export function SignIn({ notAdmin = false }: { notAdmin?: boolean }) {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        <Text style={[type.large, { color: color.ink, textAlign: 'center' }]}>Not an ops account</Text>
        <Text style={[type.body, styles.sub, { textAlign: 'center' }]}>
          This app is for the Caresy dispatch desk. Sign in with an account on the
          admin allowlist.
        </Text>
        <Btn label="Sign out" tone="ghost" onPress={() => signOut()} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.center, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + space.xl }]}>
        <Text style={[type.overline, { color: color.green }]}>Caresy</Text>
        <Text style={[type.large, { color: color.ink, marginTop: space.sm }]}>Dispatch</Text>
        <Text style={[type.body, styles.sub]}>Sign in to work the desk.</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@caresy.co"
          placeholderTextColor={color.faint}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          accessibilityLabel="Email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={color.faint}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={submit}
          returnKeyType="go"
          accessibilityLabel="Password"
        />

        {error ? <Text style={[type.body, { color: color.terracotta, marginTop: space.md }]}>{error}</Text> : null}

        <Btn
          label={busy ? 'Signing in…' : 'Sign in'}
          onPress={submit}
          disabled={busy || !email.trim() || !password}
          style={{ marginTop: space.lg, alignSelf: 'stretch' }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  sub: { color: color.muted, marginTop: space.sm, marginBottom: space.xl },
  input: {
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
    marginTop: space.md,
    color: color.ink,
    fontSize: 16,
  },
});
