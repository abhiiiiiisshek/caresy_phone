import { ReactNode, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isValidIndianMobile } from '@caresy/utils/phone';
import { Button, Card, LoadingState, Overline, Screen, Txt } from '../components/ui';
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
  const { session, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from('profiles').select('full_name, age, phone').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
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
        <View style={s.header}>
          <View style={s.avatar}><Txt variant="h1" color={color.onGreen}>{initial}</Txt></View>
          <Txt variant="h1" color={color.ink}>{displayName}</Txt>
          <Txt variant="body" color={color.muted}>{profile?.age ? `Age ${profile.age}` : `Member since ${memberSince}`}</Txt>
          <Txt variant="caption" color={color.faint}>{session.user.email}</Txt>
        </View>

        <Section title="Account">
          <Row
            title="Mobile number"
            sub={isValidIndianMobile(profile?.phone || '') ? profile!.phone! : 'Not added — tap to add'}
            onPress={() => Linking.openURL(supWa('adding my mobile number to my profile'))}
          />
          <Row title="Payment methods" sub="Cash or UPI, paid after the visit" />
          <Row title="Companion preferences" onPress={() => Linking.openURL(supWa('my companion preferences'))} />
        </Section>

        <Section title="Activity">
          <Row title="My bookings" onPress={() => router.push('/my-bookings')} />
          <Row title="Care guides" sub="Short reads on recovery, medicines, falls and more" onPress={() => router.push('/care')} />
        </Section>

        <Section title="Help & support">
          <Row title="Chat on WhatsApp" sub="Fastest — usually answered in minutes" onPress={() => Linking.openURL(supWa('a general question'))} />
          <Row title="Call us" sub={SUPPORT_TEL} onPress={() => Linking.openURL(`tel:${SUPPORT_TEL}`)} />
          <Row title="Email" sub="Replies within 24 hours" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </Section>

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

  header: { alignItems: 'center', gap: space.xs },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },

  section: { gap: space.sm },
  sectionBody: { gap: space.sm },
  row: { gap: 2 },

  signOut: { marginTop: space.sm },
});
