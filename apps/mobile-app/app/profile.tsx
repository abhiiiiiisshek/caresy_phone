import { ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isValidIndianMobile, toE164 } from '@caresy/utils/phone';
import { Button, Card, Field, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { color, space } from '../lib/theme';

// Mirrors apps/website/src/app/profile/page.tsx's sections, native layout.
// Folds Settings + Support — nothing to configure (cash/UPI only, no in-app
// notification prefs yet) and Support is one WhatsApp/call/email block, not
// enough content for its own screen. See NATIVE_CHECKLIST.md.
const SUPPORT_WA = '919717500225';
const SUPPORT_TEL = '+919717500225';
const SUPPORT_EMAIL = 'support@caresy.co.in';
const supWa = (topic: string) =>
  `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Hello Caresy Support,\n\nI need help with: ${topic}.`)}`;

type Profile = { full_name: string | null; age: number | null; phone: string | null };

function Row({ title, sub, onPress }: { title: string; sub?: string; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={s.row}>
      <Txt variant="title" color={color.ink}>{title}</Txt>
      {sub ? <Txt variant="caption" color={color.muted}>{sub}</Txt> : null}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Overline>{title}</Overline>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const { session, loading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const router = useRouter();
  const reduceMotion = false; // RN 0.86: reanimated removed, fallback to full motion (respect via AccessibilityInfo if needed)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from('profiles').select('full_name, age, phone').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        if (data?.phone) setPhoneDraft(data.phone);
      });
  }, [session]);

  if (loading) return <Screen><LoadingState /></Screen>;

  if (!session) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Profile' }} />
        <View style={s.signedOut}>
          <Txt variant="h1" color={color.greenDeep} style={s.centerText}>Your profile lives here</Txt>
          <Txt variant="body" color={color.muted} style={s.centerText}>
            Sign in to save your details, keep every visit in one place, and follow companions live.
          </Txt>
          <Button
            title="Sign in with Google"
            loading={signingIn}
            onPress={async () => { setSigningIn(true); try { await signInWithGoogle(); } finally { setSigningIn(false); } }}
            style={s.signInBtn}
          />
          {Platform.OS === 'ios' ? (
            <Button
              title="Sign in with Apple"
              variant="secondary"
              loading={signingIn}
              onPress={async () => { setSigningIn(true); try { await signInWithApple(); } finally { setSigningIn(false); } }}
              style={s.signInBtn}
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  const displayName = profile?.full_name || (session.user.user_metadata?.full_name as string) || (session.user.user_metadata?.name as string) || 'there';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = new Date(session.user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Profile' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View>
          <View style={s.headerGlow} />
          <View style={s.header}>
            <View style={s.avatar}><Txt variant="h1" color={color.onGreen}>{initial}</Txt></View>
            <Txt variant="h1" color={color.ink}>{displayName}</Txt>
            <Txt variant="body" color={color.muted}>{profile?.age ? `Age ${profile.age}` : `Member since ${memberSince}`}</Txt>
            <Txt variant="caption" color={color.faint}>{session.user.email}</Txt>
          </View>
        </View>

        <View>
          <Section title="Account">
            {editingPhone ? (
              <Card level="raised" style={s.editCard}>
                <Field
                  label="Mobile number"
                  value={phoneDraft}
                  onChangeText={(t) => { setPhoneDraft(t); setPhoneErr(null); }}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  error={phoneErr}
                />
                <View style={s.editRow}>
                  <Button title="Cancel" variant="secondary" onPress={() => { setEditingPhone(false); setPhoneDraft(profile?.phone || ''); setPhoneErr(null); }} style={s.editBtn} />
                  <Button
                    title="Save"
                    loading={phoneSaving}
                    onPress={async () => {
                      if (!isValidIndianMobile(phoneDraft)) { setPhoneErr('Enter a valid 10-digit number'); return; }
                      setPhoneSaving(true);
                      const { error } = await supabase.from('profiles').update({ phone: toE164(phoneDraft) }).eq('id', session!.user.id);
                      setPhoneSaving(false);
                      if (error) { setPhoneErr(error.message); return; }
                      setProfile((p) => p ? { ...p, phone: toE164(phoneDraft) } : p);
                      setEditingPhone(false);
                    }}
                    style={s.editBtn}
                  />
                </View>
              </Card>
            ) : (
              <Row
                title="Mobile number"
                sub={isValidIndianMobile(profile?.phone || '') ? profile!.phone! : 'Not added — tap to add'}
                onPress={() => setEditingPhone(true)}
              />
            )}
            <Row title="Payment methods" sub="Cash or UPI, paid after the visit" />
            <Row title="Companion preferences" onPress={() => Linking.openURL(supWa('my companion preferences'))} />
          </Section>
        </View>

        <View>
          <Section title="Activity">
            <Row title="My bookings" onPress={() => router.push('/my-bookings')} />
            <Row title="Care guides" sub="Short reads on recovery, medicines, falls and more" onPress={() => router.push('/care')} />
          </Section>
        </View>

        <View>
          <Section title="Help & support">
            <Row title="Chat on WhatsApp" sub="Fastest — usually answered in minutes" onPress={() => Linking.openURL(supWa('a general question'))} />
            <Row title="Call us" sub={SUPPORT_TEL} onPress={() => Linking.openURL(`tel:${SUPPORT_TEL}`)} />
            <Row title="Email" sub="Replies within 24 hours" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          </Section>
        </View>

        <View>
          <Section title="Danger zone">
            <Card level="overlay" style={s.dangerCard}>
              <Txt variant="title" color={color.terracottaDeep}>Delete account</Txt>
              <Txt variant="caption" color={color.muted}>Permanently removes profile, patients, bookings and care logs. Cannot be undone.</Txt>
              <Button
                title="Delete my account"
                variant="danger"
                onPress={() => {
                  Alert.alert(
                    'Delete account?',
                    'This permanently deletes your account and all data. Type DELETE to confirm on the next screen.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Continue', style: 'destructive', onPress: () => router.push('/account-delete') },
                    ],
                  );
                }}
                style={s.deleteBtn}
              />
            </Card>
          </Section>
        </View>

        <Button title="Sign out" variant="secondary" onPress={() => signOut()} style={s.signOut} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  centerText: { textAlign: 'center' },
  signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  signInBtn: { alignSelf: 'stretch', marginTop: space.lg },

  headerWrap: { alignItems: 'center', paddingVertical: space.lg, overflow: 'hidden', borderRadius: 18, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  headerGlow: { position: 'absolute', top: -28, right: -28, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(27,77,62,0.07)' },
  header: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm, shadowColor: '#0B2A20', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },

  section: { gap: space.sm },
  sectionBody: { gap: space.sm },
  row: { gap: 2 },
  editCard: { gap: space.md },
  editRow: { flexDirection: 'row', gap: space.md },
  editBtn: { flex: 1 },
  dangerCard: { gap: space.sm, borderWidth: 1, borderColor: 'rgba(196,85,67,0.25)' },
  deleteBtn: { marginTop: space.xs },

  signOut: { marginTop: space.sm },
});
