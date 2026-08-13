import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { getStatusInfo, isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { Button, Card, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { color, radius, shadow, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';

type Profile = { full_name: string | null };
interface NextBooking {
  id: string;
  reference_code: string;
  status: string;
  scheduled_start_time: string | null;
  service_type: string;
  service_metadata: any;
}

function serviceLabel(b: NextBooking) {
  return (b.service_metadata?.originalService as string) || prettyService(b.service_type || 'Booking');
}
function whenLabel(iso: string | null) {
  if (!iso) return 'Time to be confirmed';
  return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Home() {
  const { session, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [next, setNext] = useState<NextBooking | null | undefined>(undefined); // undefined = not loaded
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!session) { setProfile(null); setNext(undefined); return; }
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from('bookings')
      .select('id, reference_code, status, scheduled_start_time, service_type, service_metadata')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as NextBooking[]) || [];
        const live = rows.find((b) => b.status.toLowerCase().includes('progress'));
        const upcoming = rows.filter((b) => !isPastBooking(b))
          .sort((a, b) => (a.scheduled_start_time ?? '').localeCompare(b.scheduled_start_time ?? ''))[0];
        setNext(live ?? upcoming ?? null);
      });
  }, [session]);

  if (loading) return <Screen><LoadingState /></Screen>;

  /* ---- Signed out: branded welcome ---- */
  if (!session) {
    return (
      <Screen>
        <View style={s.welcome}>
          <View style={s.logoBadge}><Txt variant="display" color={color.onGreen}>C</Txt></View>
          <Txt variant="display" color={color.greenDeep}>Caresy</Txt>
          <Txt variant="body" color={color.muted} style={s.centerText}>
            A trusted companion for every hospital visit — booked in minutes.
          </Txt>
          <Button
            title="Sign in with Google"
            loading={signingIn}
            onPress={async () => {
              setSigningIn(true);
              try { await signInWithGoogle(); } finally { setSigningIn(false); }
            }}
            style={s.welcomeBtn}
          />
        </View>
      </Screen>
    );
  }

  /* ---- Signed in: dashboard ---- */
  const name = profile?.full_name?.split(' ')[0]
    ?? (session.user.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? 'there';

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.greeting}>
          <Overline>Welcome back</Overline>
          <Txt variant="display" color={color.greenDeep}>Hi, {name}</Txt>
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/booking'); }}
          accessibilityRole="button"
          accessibilityLabel="Book a companion"
          style={({ pressed }) => [s.hero, shadow.card, pressed && s.pressed]}
        >
          <Txt variant="h1" color={color.onGreen}>Book a companion</Txt>
          <Txt variant="body" color="rgba(255,255,255,0.85)">
            Doctor visits, procedures, medicine pickup — someone there the whole time.
          </Txt>
          <View style={s.heroCta}><Txt variant="label" color={color.greenDeep}>Start booking →</Txt></View>
        </Pressable>

        {/* Next visit */}
        <View style={s.section}>
          <Txt variant="h2" color={color.ink}>Your next visit</Txt>
          {next === undefined ? (
            <Card><LoadingState /></Card>
          ) : next === null ? (
            <Card>
              <Txt variant="body" color={color.muted}>No upcoming visits.</Txt>
              <Txt variant="caption" color={color.faint}>Book one above and it will appear here.</Txt>
            </Card>
          ) : (
            <Card onPress={() => router.push('/my-bookings')}>
              <View style={s.rowBetween}>
                <Txt variant="title" color={color.ink} style={s.flex1}>{serviceLabel(next)}</Txt>
                <StatusPill status={next.status} />
              </View>
              <Txt variant="body" color={color.muted}>{whenLabel(next.scheduled_start_time)}</Txt>
              <Txt variant="caption" color={color.faint}>Ref {next.reference_code} · {getStatusInfo(next.status).label}</Txt>
            </Card>
          )}
        </View>

        {/* Quick actions */}
        <View style={s.actions}>
          <QuickAction label="My bookings" onPress={() => router.push('/my-bookings')} />
          <QuickAction label="Get help" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}`)} />
        </View>

        <Button title="Sign out" variant="secondary" onPress={() => signOut()} style={s.signOut} />
      </ScrollView>
    </Screen>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.action, shadow.card, pressed && s.pressed]}
    >
      <Txt variant="title" color={color.greenDeep}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  flex1: { flex: 1 },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  logoBadge: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  welcomeBtn: { alignSelf: 'stretch', marginTop: space.lg },

  greeting: { gap: space.xs },
  hero: { backgroundColor: color.green, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  heroCta: { alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: color.onGreen, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },

  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },

  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, minHeight: 72, justifyContent: 'center' },
  signOut: { marginTop: space.sm },
});
