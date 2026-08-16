import { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

let LinearGradient: any = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
  // In Expo Go (storeClient) the native view is missing — null it to avoid WARN
  const execEnv = (Constants as any).executionEnvironment;
  const ownership = (Constants as any).appOwnership;
  if (execEnv === 'storeClient' || ownership === 'expo') LinearGradient = null;
} catch {
  LinearGradient = null;
}

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { Button, Card, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { color, radius, shadow, space } from '../lib/theme';

// SF Symbols for iOS with consistent Android fallback — lazy to keep web/SSR green
let SymbolView: any = null;
try { SymbolView = require('expo-symbols').SymbolView; } catch {}
const SF: Record<string, string> = {
  bookings: 'calendar',
  care: 'book.closed',
  help: 'questionmark.bubble',
  profile: 'person.crop.circle',
  urgent: 'bolt.heart',
  schedule: 'calendar.badge.plus',
};
const FallbackGlyph: Record<string, string> = {
  bookings: '▦',
  care: '✦',
  help: '◐',
  profile: '●',
  urgent: '♥',
  schedule: '◑',
};

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
    let cancelled = false;
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setProfile(data); });
    // Efficiency: limit + server-side ordering avoids fetching entire history; client still picks live vs upcoming.
    supabase.from('bookings')
      .select('id, reference_code, share_token, status, scheduled_start_time, service_type, service_metadata')
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as NextBooking[]) || [];
        const live = rows.find((b) => b.status.toLowerCase().includes('progress'));
        const upcoming = rows.filter((b) => !isPastBooking(b))
          .sort((a, b) => (a.scheduled_start_time ?? '').localeCompare(b.scheduled_start_time ?? ''))[0];
        setNext(live ?? upcoming ?? null);
      });
    return () => { cancelled = true; };
  }, [session]);

  // Marvel-ready derived memo: avoids re-sorting on every render.
  const greetingMemo = useMemo(() => name, [profile?.full_name, session?.user?.user_metadata]);

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

        {/* Primary actions — pixel-identical to website page.tsx ActionCards (bg/ink/btnBg/label/title/desc + photo bleed) */}
        <View style={s.primaryActions}>
          <ActionCard
            bg={color.urgentBg}
            ink={color.urgentInk}
            btnBg={color.urgent}
            label="Immediate need"
            title="Urgent Booking"
            desc="Find a companion for last-minute emergencies."
            sf={SF.urgent}
            fallback={FallbackGlyph.urgent}
            decor="urgent"
            img={require('../assets/caresy-hospital-support.webp')}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/quick-help'); }}
            accessibilityLabel="Urgent booking — get a companion now"
          />
          <ActionCard
            bg={color.green}
            ink={color.onGreen}
            inkMuted="rgba(255,255,255,0.82)"
            btnBg={color.greenDeep}
            label="Plan ahead"
            title="Schedule Appointment"
            desc="Book a companion for a future medical visit."
            sf={SF.schedule}
            fallback={FallbackGlyph.schedule}
            decor="schedule"
            img={require('../assets/caresy-family-app.webp')}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/booking'); }}
            accessibilityLabel="Schedule appointment for later"
          />
        </View>

        {/* Next visit — marvel empty state replaces blank card */}
        <View style={s.section}>
          <Txt variant="h2" color={color.ink}>Your next visit</Txt>
          {next === undefined ? (
            <Card><View style={s.skeletonRow}><View style={s.skelLine} /><View style={[s.skelLine, { width: '60%' }]} /></View></Card>
          ) : next === null ? (
            <Card style={s.emptyCard}>
              <View style={s.emptyIcon}><Txt variant="h1" color={color.green}>✦</Txt></View>
              <Txt variant="title" color={color.ink} style={{ textAlign: 'center' }}>No upcoming visits</Txt>
              <Txt variant="caption" color={color.faint} style={{ textAlign: 'center' }}>Your next booking will appear here with live tracking.</Txt>
              <Pressable onPress={() => router.push('/booking')} style={({ pressed }) => [s.emptyCta, pressed && s.pressed]}>
                <Txt variant="label" color={color.onGreen}>Book a visit</Txt>
              </Pressable>
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

        {/* Quick actions — SF Symbols on iOS, consistent glyph fallback on Android/web */}
        <View style={s.actions}>
          <QuickAction label="My bookings" sub="Track & manage" onPress={() => router.push('/my-bookings')} sf={SF.bookings} fallback={FallbackGlyph.bookings} />
          <QuickAction label="Care guides" sub="Recovery tips" onPress={() => router.push('/care')} sf={SF.care} fallback={FallbackGlyph.care} />
          <QuickAction label="Get help" sub="Chat or call" onPress={() => router.push('/support')} sf={SF.help} fallback={FallbackGlyph.help} />
          <QuickAction label="Profile" sub="You & family" onPress={() => router.push('/profile')} sf={SF.profile} fallback={FallbackGlyph.profile} />
        </View>

        {/* Trust — mirrors website Verified Companions, not chips inside urgent */}
        <View style={s.trustCard}>
          <View style={s.trustHeaderRow}>
            {Platform.OS === 'ios' && SymbolView ? (
              <SymbolView name="checkmark.shield.fill" size={20} tintColor={color.green} />
            ) : (
              <Txt variant="label" color={color.green}>✓</Txt>
            )}
            <Txt variant="title" color={color.ink}>Verified Companions</Txt>
          </View>
          <Txt variant="caption" color={color.muted} style={s.trustBody}>
            Your safety is our priority. Aadhaar-verified companions, 4.9/5 from 5k+ visits in Noida & Greater Noida.
          </Txt>
          <View style={s.trustRow}>
            <View style={s.trustChip}><Txt variant="caption" color={color.greenDeep}>✓ Aadhaar-verified</Txt></View>
            <View style={s.trustChip}><Txt variant="caption" color={color.greenDeep}>4.9/5 · 5k+ visits</Txt></View>
            <View style={s.trustChip}><Txt variant="caption" color={color.greenDeep}>Noida & Greater Noida</Txt></View>
          </View>
        </View>

        <Button title="Sign out" variant="secondary" onPress={() => signOut()} style={s.signOut} />
      </ScrollView>
    </Screen>
  );
}

function ActionCard({ bg, ink, inkMuted, btnBg, label, title, desc, sf, fallback, decor, img, onPress, accessibilityLabel }: {
  bg: string; ink: string; inkMuted?: string; btnBg: string; label: string; title: string; desc: string;
  sf?: string; fallback?: string; decor: 'urgent' | 'schedule'; img?: any; onPress: () => void; accessibilityLabel: string;
}) {
  const useSF = Platform.OS === 'ios' && !!SymbolView && !!sf;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [s.actionCard, { backgroundColor: bg }, shadow.card, pressed && s.pressedCard]}
    >
      {/* Photo bleed — exact website ActionCard: image covers right 64% */}
      {img ? (
        <>
          <Image source={img} style={s.actionImg} resizeMode="cover" accessibilityIgnoresInvertColors />
          {/* Fade into card colour so copy stays legible — matches website: linear-gradient(90deg, bg 0%, bg 36%, transparent 84%) */}
          {LinearGradient ? (
            <LinearGradient
              colors={[bg, bg, 'transparent']}
              locations={[0, 0.36, 0.84]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.actionImgFade}
              pointerEvents="none"
            />
          ) : (
            <View style={[s.actionImgFade, { backgroundColor: bg, opacity: 0.92 }]} pointerEvents="none" />
          )}
        </>
      ) : (
        <View style={[s.actionDecor, decor === 'urgent' ? s.actionDecorUrgent : s.actionDecorGreen]} pointerEvents="none">
          <Txt variant="display" color={decor === 'urgent' ? 'rgba(147,0,10,0.08)' : 'rgba(255,255,255,0.14)'} style={s.actionDecorGlyph}>
            {decor === 'urgent' ? '✦' : '◈'}
          </Txt>
        </View>
      )}
      <View style={s.actionCardLeft}>
        <View style={s.actionLabelRow}>
          <View style={[s.actionLabelIcon, { backgroundColor: decor === 'urgent' ? '#fff' : 'rgba(255,255,255,0.18)' }]}>
            {useSF ? (
              <SymbolView name={sf!} size={14} tintColor={decor === 'urgent' ? color.urgent : color.onGreen} fallback={null} />
            ) : (
              <Txt variant="caption" color={decor === 'urgent' ? color.urgent : color.onGreen}>{fallback ?? '•'}</Txt>
            )}
          </View>
          <Overline color={decor === 'urgent' ? color.urgent : 'rgba(255,255,255,0.92)'}>{label}</Overline>
        </View>
        <Txt variant="title" color={ink} style={s.actionTitle}>{title}</Txt>
        <Txt variant="caption" color={inkMuted ?? (decor === 'urgent' ? 'rgba(147,0,10,0.72)' : 'rgba(255,255,255,0.82)')} style={s.actionDesc}>{desc}</Txt>
      </View>
      <View style={[s.actionArrow, { backgroundColor: btnBg }]}>
        <Txt variant="label" color="#fff">→</Txt>
      </View>
    </Pressable>
  );
}

function QuickAction({ label, sub, onPress, sf, fallback }: { label: string; sub?: string; onPress: () => void; sf?: string; fallback?: string }) {
  const useSF = Platform.OS === 'ios' && !!SymbolView && !!sf;
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.action, shadow.card, pressed && s.pressed, Platform.OS === 'ios' ? s.actionIos : s.actionAndroid]}
    >
      <View style={s.actionIcon}>
        {useSF ? (
          <SymbolView name={sf!} size={18} tintColor={color.green} fallback={null} />
        ) : (
          <Txt variant="caption" color={color.green}>{fallback ?? '•'}</Txt>
        )}
      </View>
      <Txt variant="title" color={color.greenDeep}>{label}</Txt>
      {sub ? <Txt variant="caption" color={color.faint}>{sub}</Txt> : null}
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
  // Primary actions — 1:1 cards inside scroll, mirrors website ActionCard row
  primaryActions: { gap: space.md },
  actionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 132, padding: space.lg, borderRadius: radius.lg, overflow: 'hidden', gap: space.md },
  actionCardLeft: { flex: 1, gap: 4, zIndex: 1, maxWidth: 210 },
  actionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actionLabelIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 19, lineHeight: 24 },
  actionDesc: { lineHeight: 16, opacity: 0.9 },
  actionArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 },
  actionImg: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '64%' },
  actionImgFade: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  // Fallback decor when no image
  actionDecor: { position: 'absolute', right: -8, bottom: -8, width: 96, height: 96, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  actionDecorUrgent: {},
  actionDecorGreen: {},
  actionDecorGlyph: { fontSize: 72, lineHeight: 72 },
  pressedCard: { opacity: 0.96, transform: [{ scale: 0.985 }] },
  trustCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: 'rgba(192,201,195,0.35)' },
  trustHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trustBody: { lineHeight: 18 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  trustChip: { backgroundColor: color.greenTint, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(27,77,62,0.08)' },

  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  action: { flexBasis: '46%', flexGrow: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, minHeight: 88, justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent' },
  actionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.greenTint, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionIos: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.06)' },
  actionAndroid: { backgroundColor: color.surface, borderColor: color.line, elevation: 1 },
  skeletonRow: { gap: space.sm },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: '#E8EDE9', width: '100%' },
  emptyCard: { alignItems: 'center', paddingVertical: space.xl, gap: space.sm },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.greenTint, alignItems: 'center', justifyContent: 'center' },
  emptyCta: { marginTop: space.sm, backgroundColor: color.green, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },
  signOut: { marginTop: space.sm },
});
