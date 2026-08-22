import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { Button, Card, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { CapyMascot, FloatDot } from '../components/CapyMascot';
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

  /* ---- Signed out: beautiful auth with capy mascot ---- */
  if (!session) {
    return <BeautifulAuth signingIn={signingIn} onGoogle={async () => { setSigningIn(true); try { await signInWithGoogle(); } finally { setSigningIn(false); } }} />;
  }

  /* ---- Signed in: dashboard ---- */
  const name = profile?.full_name?.split(' ')[0]
    ?? (session.user.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? 'there';
  // personalized post-visit detection (past bookings exist but no upcoming)
  const hasPastVisit = next === null; // null = loaded & no upcoming, implies past or first-visit; AnimatedHeadline will refine via locale pools

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.greeting}>
          <Overline>Welcome back</Overline>
          <AnimatedHeadline name={name} hasUpcoming={!!next?.scheduled_start_time} hasPastVisit={hasPastVisit} />
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

        {/* Quick actions */}
        <View style={s.actions}>
          <QuickAction label="My bookings" onPress={() => router.push('/my-bookings')} />
          <QuickAction label="Urgent help" onPress={() => router.push('/quick-help')} />
        </View>
        <View style={s.actions}>
          <QuickAction label="Care guides" onPress={() => router.push('/care')} />
          <QuickAction label="Profile" onPress={() => router.push('/profile')} />
        </View>
        <View style={s.supportRow}>
          <Txt variant="caption" color={color.faint}>Need to talk to a human? </Txt>
          <Txt variant="label" color={color.greenDeep} onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}`)}>WhatsApp us</Txt>
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

/* ── Beautiful Auth (Q-learn + capy inspo) ── */
function BeautifulAuth({ signingIn, onGoogle }: { signingIn: boolean; onGoogle: () => void }) {
  const cardIn = useRef(new Animated.Value(40)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const deco = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardIn, { toValue: 0, duration: 700, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 700, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(deco, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      Animated.timing(deco, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
    ])).start();
  }, [cardIn, cardOp, deco]);

  return (
    <View style={a.screen}>
      {/* top brand */}
      <View style={a.topBrand}>
        <Text style={a.brandStar}>✦</Text>
        <Text style={a.brandName}>Caresy</Text>
      </View>

      {/* mascot stage — sky like capy photo */}
      <View style={a.stage}>
        {/* floating deco like Q-learn planets/stars */}
        <Animated.View style={[a.floatA, { transform: [{ translateY: deco.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
          <View style={a.planet} />
        </Animated.View>
        <Animated.View style={[a.floatB, { transform: [{ translateY: deco.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }]}>
          <View style={a.ringPlanet} />
        </Animated.View>
        <View style={a.star1}><Text style={a.starTxt}>✦</Text></View>
        <View style={a.star2}><Text style={a.starTxtSmall}>✦</Text></View>
        <FloatDot size={6} color="rgba(255,255,255,0.9)" style={{ position: 'absolute', left: 34, top: 44 }} delay={200} />
        <FloatDot size={10} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', right: 28, top: 36 }} delay={600} />
        <FloatDot size={5} color="#1B4D3E" style={{ position: 'absolute', left: 54, top: 18, opacity: 0.12 }} delay={400} />
        {/* mascot */}
        <View style={a.mascotWrap}>
          <CapyMascot />
        </View>
        {/* subtle ground curve */}
        <View style={a.ground} />
      </View>

      {/* bottom sheet card — like Q-learn Sign Up */}
      <Animated.View style={[a.card, { opacity: cardOp, transform: [{ translateY: cardIn }] }]}>
        <Text style={a.h1}>Care you can{'\n'}trust, instantly.</Text>
        <Text style={a.sub}>Book a trained hospital companion in minutes. Queues, paperwork, pharmacy — we handle it, you stay with family.</Text>

        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onGoogle(); }} disabled={signingIn} style={({ pressed }) => [a.primaryBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
          {signingIn ? <Text style={a.primaryTxt}>Signing in…</Text> : (
            <View style={a.btnRow}>
              <View style={a.gBadge}><Text style={a.gTxt}>G</Text></View>
              <Text style={a.primaryTxt}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        <View style={a.dividerRow}>
          <View style={a.divLine} />
          <Text style={a.divTxt}>or</Text>
          <View style={a.divLine} />
        </View>

        <Pressable onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('Hi Caresy, I need help booking a companion')}`)} style={({ pressed }) => [a.secondaryBtn, pressed && { opacity: 0.9 }]}>
          <Text style={a.secondaryTxt}>Chat on WhatsApp</Text>
        </Pressable>

        <Text style={a.legal}>By continuing you agree to our <Text style={a.link} onPress={() => Linking.openURL('https://caresy.co.in/terms')}>Terms</Text> · <Text style={a.link} onPress={() => Linking.openURL('https://caresy.co.in/privacy')}>Privacy</Text></Text>

        <View style={a.trustRow}>
          <View style={a.trustPill}><Text style={a.trustTxt}>✓ Trusted in Noida</Text></View>
          <View style={a.trustPill}><Text style={a.trustTxt}>✓ 2k+ visits</Text></View>
        </View>
      </Animated.View>
    </View>
  );
}
const SUPPORT_WA = '919717500225';

const a = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#AEDFF5' },
  topBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 52, paddingBottom: 10 },
  brandStar: { fontSize: 16, color: '#1B4D3E', fontWeight: '800' },
  brandName: { fontSize: 16, color: '#1B4D3E', fontWeight: '800', letterSpacing: 0.6 },
  stage: { height: 300, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 18 },
  mascotWrap: { zIndex: 2, marginBottom: 2 },
  ground: { position: 'absolute', bottom: -22, width: 320, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)' },
  floatA: { position: 'absolute', left: 22, top: 28 },
  floatB: { position: 'absolute', right: 22, top: 18 },
  planet: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#1B4D3E', opacity: 0.9 },
  ringPlanet: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.0)', borderWidth: 2, borderColor: 'rgba(27,77,62,0.18)', transform: [{ rotate: '18deg' }] },
  star1: { position: 'absolute', left: 86, top: 72 },
  star2: { position: 'absolute', right: 76, top: 88 },
  starTxt: { fontSize: 14, color: 'rgba(27,77,62,0.14)', fontWeight: '700' },
  starTxtSmall: { fontSize: 10, color: 'rgba(27,77,62,0.12)', fontWeight: '700' },
  card: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 24, gap: 14, ...shadow.card, shadowOpacity: 0.12, shadowRadius: 24 },
  h1: { fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#0F1F1C', letterSpacing: -0.6 },
  sub: { fontSize: 14, lineHeight: 20, color: '#5B6B64', marginTop: -4 },
  primaryBtn: { marginTop: 6, minHeight: 56, borderRadius: 999, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  gTxt: { fontSize: 14, fontWeight: '800', color: '#1B4D3E' },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  divLine: { flex: 1, height: 1, backgroundColor: '#E8ECE9' },
  divTxt: { fontSize: 12, color: '#9AA5A0', fontWeight: '600' },
  secondaryBtn: { minHeight: 52, borderRadius: 999, borderWidth: 1.5, borderColor: '#1B4D3E', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: '#1B4D3E' },
  legal: { textAlign: 'center', fontSize: 11, lineHeight: 16, color: '#9AA5A0', marginTop: 2 },
  link: { color: '#1B4D3E', fontWeight: '700' },
  trustRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 2 },
  trustPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E7F2ED' },
  trustTxt: { fontSize: 11, fontWeight: '700', color: '#1B4D3E' },
});

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  flex1: { flex: 1 },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  greeting: { gap: space.xs },
  hero: { backgroundColor: color.green, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  heroCta: { alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: color.onGreen, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },
  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, minHeight: 72, justifyContent: 'center' },
  supportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  signOut: { marginTop: space.sm },
});
