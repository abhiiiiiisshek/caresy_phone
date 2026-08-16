import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { Button, Card, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { color, radius, shadow, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';

type Profile = { full_name: string | null };
interface NextBooking {
  id: string;
  reference_code: string;
  share_token: string;
  status: string;
  scheduled_start_time: string | null;
  service_type: string;
  service_metadata: any;
}

function isTrackable(status: string) {
  const s = status.toLowerCase();
  return s.includes('assigned') || s.includes('accepted') || s.includes('progress') || s === 'active';
}

function serviceLabel(b: NextBooking) {
  return (b.service_metadata?.originalService as string) || prettyService(b.service_type || 'Booking');
}
function whenLabel(iso: string | null) {
  if (!iso) return 'Time to be confirmed';
  return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Home() {
  const { session, loading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [next, setNext] = useState<NextBooking | null | undefined>(undefined); // undefined = not loaded
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!session) { setProfile(null); setNext(undefined); return; }
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from('bookings')
      .select('id, reference_code, share_token, status, scheduled_start_time, service_type, service_metadata')
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
          {Platform.OS === 'ios' ? (
            <Button
              title="Sign in with Apple"
              variant="secondary"
              loading={signingIn}
              onPress={async () => {
                setSigningIn(true);
                try { await signInWithApple(); } finally { setSigningIn(false); }
              }}
              style={s.welcomeBtn}
            />
          ) : null}
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

        {/* Primary — URGENT dominates (emotional, fast, biggest) */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/quick-help'); }}
          accessibilityRole="button"
          accessibilityLabel="Need help urgently"
          style={({ pressed }) => [s.heroUrgentPrimary, shadow.card, pressed && s.pressed, Platform.OS === 'ios' && s.glassIos]}
        >
          <View style={s.urgentGlow} />
          <View style={s.urgentGlow2} />
          <Overline color={color.urgent}>Immediate response</Overline>
          <Txt variant="display" color={color.urgentInk}>Need help urgently?</Txt>
          <Txt variant="body" color="rgba(147,0,10,0.78)">
            Today's appointment, queue or medicine — we assign a companion right now.
          </Txt>
          <View style={s.heroUrgentCta}><Txt variant="label" color={color.onGreen}>Get urgent help →</Txt></View>
          <Txt variant="caption" color="rgba(147,0,10,0.55)">Usually assigned in minutes · Noida & Greater Noida</Txt>
        </Pressable>

        {/* Secondary — Scheduled, still graphic but calmer */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/booking'); }}
          accessibilityRole="button"
          accessibilityLabel="Book a companion for later"
          style={({ pressed }) => [s.heroScheduled, shadow.card, pressed && s.pressed, Platform.OS === 'ios' && s.glassIos]}
        >
          <View style={s.scheduledGlow} />
          <Txt variant="h1" color={color.onGreen}>Book a companion</Txt>
          <Txt variant="body" color="rgba(255,255,255,0.86)">
            Plan ahead — doctor visits, procedures, elder care. Pick date & time.
          </Txt>
          <View style={s.heroCta}><Txt variant="label" color={color.greenDeep}>Schedule →</Txt></View>
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
            <Card onPress={() => isTrackable(next.status)
              ? router.push({ pathname: '/tracking', params: { token: next.share_token } })
              : router.push('/my-bookings')}>
              <View style={s.rowBetween}>
                <Txt variant="title" color={color.ink} style={s.flex1}>{serviceLabel(next)}</Txt>
                <StatusPill status={next.status} />
              </View>
              <Txt variant="body" color={color.muted}>{whenLabel(next.scheduled_start_time)}</Txt>
              <Txt variant="caption" color={color.faint}>
                {isTrackable(next.status) ? 'Tap to track live · ' : ''}Ref {next.reference_code}
              </Txt>
            </Card>
          )}
        </View>

        {/* Quick actions — no duplicate urgent; Get Help goes to real support */}
        <View style={s.actions}>
          <QuickAction label="My bookings" onPress={() => router.push('/my-bookings')} icon="◷" />
          <QuickAction label="Care guides" onPress={() => router.push('/care')} icon="✦" />
          <QuickAction label="Get help" onPress={() => router.push('/support')} icon="?" />
          <QuickAction label="Profile" onPress={() => router.push('/profile')} icon="◯" />
        </View>

        <Button title="Sign out" variant="secondary" onPress={() => signOut()} style={s.signOut} />
      </ScrollView>
    </Screen>
  );
}

function QuickAction({ label, onPress, icon }: { label: string; onPress: () => void; icon?: string }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.action, shadow.card, pressed && s.pressed, Platform.OS === 'ios' ? s.actionIos : s.actionAndroid]}
    >
      {icon ? <Txt variant="caption" color={color.faint}>{icon}</Txt> : null}
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
  heroUrgentPrimary: { backgroundColor: color.urgentBg, borderRadius: radius.lg, padding: space.xl, gap: space.sm, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(186,26,26,0.14)', minHeight: 190 },
  urgentGlow: { position: 'absolute', top: -36, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(186,26,26,0.10)' },
  urgentGlow2: { position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.55)' },
  heroUrgentCta: { alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: color.urgent, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },
  heroScheduled: { backgroundColor: color.green, borderRadius: radius.lg, padding: space.xl, gap: space.sm, overflow: 'hidden', minHeight: 148 },
  scheduledGlow: { position: 'absolute', top: -22, right: -22, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.11)' },
  heroCta: { alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: color.onGreen, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },
  glassIos: { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.02)' : undefined },

  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  action: { flexBasis: '46%', flexGrow: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, minHeight: 76, justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: 'transparent' },
  actionIos: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.06)' },
  actionAndroid: { backgroundColor: color.surface, borderColor: color.line, elevation: 1 },
  signOut: { marginTop: space.sm },
});
