import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, LoadingState, Screen, Txt, Overline } from '../components/ui';
import { color, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';
const PRIVACY_URL = 'https://caresy.co.in/privacy';
const TERMS_URL = 'https://caresy.co.in/terms';

export default function Profile() {
  const { session, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email] = useState(() => session?.user.email ?? '');

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('full_name, phone').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? '');
          setPhone(data.phone ?? '');
        } else {
          setFullName((session.user.user_metadata?.name as string) ?? '');
        }
        setLoading(false);
      });
  }, [session]);

  const save = async () => {
    if (!session) return;
    if (!fullName.trim()) { Alert.alert('Enter your name'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    setSaving(false);
    if (error) Alert.alert('Could not save', error.message);
    else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Saved'); }
  };

  const del = () => {
    Alert.alert('Delete account?', 'This will permanently delete your account and bookings. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Next step', 'To confirm, type DELETE on the next screen.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => doDelete() },
      ])},
    ]);
  };

  const doDelete = async () => {
    if (!session) return;
    const { error } = await supabase.rpc('request_account_deletion');
    if (error) Alert.alert('Could not delete', error.message);
    else {
      Alert.alert('Request received', 'Your account will be deleted within 24 hours. You will be signed out.');
      await signOut();
    }
  };

  if (loading) return <Screen><Stack.Screen options={{ headerShown: true, title: 'Profile' }} /><LoadingState /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Profile' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Overline>Your account</Overline>
        <Txt variant="h1" color={color.greenDeep}>Profile</Txt>

        <Card style={s.card}>
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="phone-pad" />
          <Field label="Email" value={email} onChangeText={() => {}} placeholder="email" />
          <Txt variant="caption" color={color.faint}>Email is managed via Google sign-in and cannot be changed here.</Txt>
          <Button title="Save changes" onPress={save} loading={saving} style={s.saveBtn} />
        </Card>

        <Txt variant="h2" color={color.ink}>Support</Txt>
        <Card>
          <Button title="Chat on WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}`)} />
          <View style={s.linkRow}>
            <Txt variant="label" color={color.greenDeep} onPress={() => Linking.openURL(PRIVACY_URL)} style={s.link}>Privacy policy</Txt>
            <Txt variant="label" color={color.greenDeep} onPress={() => Linking.openURL(TERMS_URL)} style={s.link}>Terms of service</Txt>
          </View>
        </Card>

        <Txt variant="h2" color={color.ink}>Account</Txt>
        <Card>
          <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
          <Button title="Delete account" variant="danger" onPress={del} style={s.dangerBtn} />
          <Txt variant="caption" color={color.faint} style={s.caption}>Deletion is permanent and removes your bookings and profile. Required by Play Store policy.</Txt>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  card: { gap: space.md },
  saveBtn: { marginTop: space.sm },
  linkRow: { flexDirection: 'row', gap: space.lg, marginTop: space.md, justifyContent: 'center' },
  link: { textDecorationLine: 'underline' },
  dangerBtn: { marginTop: space.md },
  caption: { marginTop: space.sm, textAlign: 'center' },
});
