import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuth } from '../lib/AuthProvider';
import { Button, Card, Field, Screen, Stagger, Txt } from '../components/ui';
import { color, space } from '../lib/theme';

export default function AccountDelete() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!session) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Delete account' }} />
        <View style={s.body}>
          <Card><Txt variant="title" color={color.ink}>Sign in required</Txt><Txt variant="body" color={color.muted}>Sign in to delete your account.</Txt></Card>
          <Button title="Go to profile" onPress={() => router.replace('/profile')} />
        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Deleted' }} />
        <View style={s.center}>
          <Txt variant="h1" color={color.greenDeep}>Account deleted</Txt>
          <Txt variant="body" color={color.muted} style={s.centerText}>Your account and personal data have been removed. Taking you home…</Txt>
        </View>
      </Screen>
    );
  }

  const canDelete = confirm.trim() === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      // The website's /api/account/delete route is the only real deletion path:
      // it runs server-side with the service-role key and calls
      // admin.auth.admin.deleteUser(), which cascades to profiles/patients/
      // bookings/etc. That route authenticates via session cookie, which the
      // mobile app doesn't have, so we pass the access token instead — the
      // route accepts either.
      const { supabase } = await import('../lib/supabase');
      const { data: { session: current } } = await supabase.auth.getSession();
      const token = current?.access_token;
      if (!token) throw new Error('Not signed in');

      // fetch has no default timeout, so on a stalled mobile connection the
      // button would spin until the user force-quits — on the one screen where
      // "did that actually work?" is the worst question to leave open.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 20_000);
      let res: Response;
      try {
        res = await fetch('https://caresy.co.in/api/account/delete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal,
        });
      } catch {
        throw new Error('Could not reach Caresy. Check your connection and try again.');
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Could not delete your account. Please contact support.');
      }

      setDone(true);
      setTimeout(async () => { await signOut(); router.replace('/'); }, 2000);
    } catch (e: unknown) {
      Alert.alert('Could not delete', (e as Error)?.message || 'Please contact support@caresy.co.in');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Delete account' }} />
      <Stagger index={0} style={s.body}>
        <Card style={s.warn}>
          <Txt variant="title" color={color.terracottaDeep}>This is permanent</Txt>
          <Txt variant="body" color={color.muted}>Deleting {session.user.email} removes profile, patients, saved locations, bookings and care logs. Cannot be undone.</Txt>
        </Card>
        <Txt variant="body" color={color.muted}>Type <Txt variant="title" color={color.terracottaDeep}>DELETE</Txt> to confirm.</Txt>
        <Field label="Confirmation" value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="none" />
        <Button title="Permanently delete my account" variant="danger" onPress={handleDelete} loading={busy} disabled={!canDelete} />
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} disabled={busy} />
      </Stagger>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, padding: space.xl, gap: space.md },
  warn: { gap: space.xs, borderWidth: 1, borderColor: 'rgba(196,85,67,0.25)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centerText: { textAlign: 'center' },
});
