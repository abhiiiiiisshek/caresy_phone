import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
// Static import — SDK 57 dev-client only (never published to Expo Go, too
// new), so the old lazy eval("require") Expo-Go dodge was dead weight and,
// worse, appeared to make the native module resolve to null at runtime,
// which silently fell back to a flat opacity overlay instead of a gradient.
import { LinearGradient } from 'expo-linear-gradient';
// Apple's own button — App Store Review 4.8 / Sign in with Apple HIG require
// ASAuthorizationAppleIDButton, not a hand-styled lookalike. Static import for
// the same dev-client reason as LinearGradient above.
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { Button, Card, Field, FormScreen, LoadingState, Overline, Screen, Stagger, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { CapyMascot, FloatDot } from '../components/CapyMascot';
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

type Profile = { full_name: string | null; onboarding_completed: boolean };
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [next, setNext] = useState<NextBooking | null | undefined>(undefined); // undefined = not loaded
  const [signingIn, setSigningIn] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');

  // First-time sign-up detail capture. Google/Apple OAuth auto-creates the
  // account either way (no separate "register" step at the provider), so a
  // new profiles row — or one with onboarding_completed still false — is how
  // we know to ask for a name before showing the dashboard. Mirrors the
  // web app's AuthModal onboarding against the same `profiles` table.
  const [obName, setObName] = useState('');
  const [obSaving, setObSaving] = useState(false);
  const [obError, setObError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      try {
        const AppleAuthentication: any = require('expo-apple-authentication');
        const avail = await AppleAuthentication.isAvailableAsync();
        if (!cancelled) setAppleAvailable(!!avail);
      } catch {
        if (!cancelled) setAppleAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setProfileLoaded(false); setNext(undefined); return; }
    let cancelled = false;
    supabase.from('profiles').select('full_name, onboarding_completed').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) { setProfile(data); setProfileLoaded(true); } });
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

  const needsOnboarding = !!session && profileLoaded && !profile?.onboarding_completed;

  useEffect(() => {
    if (needsOnboarding && !obName) {
      const meta = session?.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setObName(profile?.full_name || meta?.full_name || meta?.name || '');
    }
  }, [needsOnboarding]);

  async function handleOnboardingSubmit() {
    if (!session) return;
    const trimmed = obName.trim();
    if (!trimmed) { setObError('Name is required.'); return; }
    setObSaving(true);
    setObError('');
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, full_name: trimmed, onboarding_completed: true });
    setObSaving(false);
    if (error) { setObError(error.message); return; }
    setProfile({ full_name: trimmed, onboarding_completed: true });
  }

  if (loading || (session && !profileLoaded)) return <Screen><LoadingState /></Screen>;

  /* ---- Signed out: beautiful auth with capy mascot ---- */
  if (!session) {
    return (
      <BeautifulAuth
        signingIn={signingIn}
        appleAvailable={appleAvailable}
        onGoogle={async () => {
          setSigningIn(true);
          try { await signInWithGoogle(); } finally { setSigningIn(false); }
        }}
        onApple={async () => {
          setSigningIn(true);
          try { await signInWithApple(); } finally { setSigningIn(false); }
        }}
      />
    );
  }

  /* ---- Signed in, first time: capture a name before the dashboard ---- */
  if (needsOnboarding) {
    return (
      <Onboarding
        name={obName}
        setName={setObName}
        error={obError}
        saving={obSaving}
        onSubmit={handleOnboardingSubmit}
      />
    );
  }

  /* ---- Signed in: dashboard ---- */
  const name = profile?.full_name?.split(' ')[0]
    ?? (session.user.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? 'there';
  // next === null: loaded & no upcoming booking, implies a past or first-time visitor
  const hasPastVisit = next === null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Stagger index={0}>
          <Overline>Welcome back</Overline>
          <AnimatedHeadline name={name} hasUpcoming={!!next?.scheduled_start_time} hasPastVisit={hasPastVisit} />
        </Stagger>

        {/* Primary actions */}
        <View style={s.primaryActions}>
          <Stagger index={1}><ActionCard
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
            /></Stagger>
          <Stagger index={2}><ActionCard
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
            /></Stagger>
        </View>

        {/* Next visit */}
        <Stagger index={3}>
          <Txt variant="h2" color={color.ink}>Your next visit</Txt>
          {next === undefined ? (
            <Card><View style={s.skeletonRow}><View style={s.skelLine} /><View style={[s.skelLine, { width: '60%' }]} /></View></Card>
          ) : next === null ? (
            <Card style={s.emptyCard}>
              <View style={s.emptyIcon}><Txt variant="h1" color={color.green}>✦</Txt></View>
              <Txt variant="title" color={color.ink} style={{ textAlign: 'center' }}>No upcoming visits</Txt>
              <Txt variant="caption" color={color.faint} style={{ textAlign: 'center' }}>Your next booking will appear here with live tracking.</Txt>
              <Pressable onPress={() => router.push('/booking')} style={({ pressed }) => [s.emptyCta, pressed && s.pressedCard]}>
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
        </Stagger>

        {/* Quick actions — stagger 56ms */}
        <View style={s.actions}>
          {[
            { label: 'My bookings', sub: 'Track & manage', route: '/my-bookings' as const, sf: SF.bookings, fb: FallbackGlyph.bookings, tint: color.greenTint, iconColor: color.green },
            { label: 'Care guides', sub: 'Recovery tips', route: '/care' as const, sf: SF.care, fb: FallbackGlyph.care, tint: color.terracottaSoft, iconColor: color.terracottaDeep },
            { label: 'Get help', sub: 'Chat or call', route: '/support' as const, sf: SF.help, fb: FallbackGlyph.help, tint: color.successSoft, iconColor: color.success },
            { label: 'Profile', sub: 'You & family', route: '/profile' as const, sf: SF.profile, fb: FallbackGlyph.profile, tint: color.chip, iconColor: color.muted },
          ].map((a, i) => (
              <Stagger key={a.label} index={4 + i} style={s.actionStagger}><QuickAction label={a.label} sub={a.sub} onPress={() => router.push(a.route)} sf={a.sf} fallback={a.fb} tint={a.tint} iconColor={a.iconColor} /></Stagger>
          ))}
        </View>

        <Stagger index={8}>
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
        </Stagger>

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
          <View style={s.actionImgBox}>
            <Image source={img} style={s.actionImgFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          </View>
          {/* Fade into card colour so copy stays legible — matches website: linear-gradient(90deg, bg 0%, bg 36%, transparent 84%) */}
          <LinearGradient
            colors={[bg, bg, 'transparent']}
            locations={[0, 0.36, 0.84]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.actionImgFade}
            pointerEvents="none"
          />
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

function QuickAction({ label, sub, onPress, sf, fallback, tint, iconColor }: { label: string; sub?: string; onPress: () => void; sf?: string; fallback?: string; tint: string; iconColor: string }) {
  const useSF = Platform.OS === 'ios' && !!SymbolView && !!sf;
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.action, shadow.raised, pressed && s.pressedCard, Platform.OS === 'ios' ? s.actionIos : s.actionAndroid]}
    >
      <View style={[s.actionIcon, { backgroundColor: tint }]}>
        {useSF ? (
          <SymbolView name={sf!} size={20} tintColor={iconColor} fallback={null} />
        ) : (
          <Txt variant="title" color={iconColor}>{fallback ?? '•'}</Txt>
        )}
      </View>
      <Txt variant="title" color={color.greenDeep}>{label}</Txt>
      {sub ? <Txt variant="caption" color={color.faint}>{sub}</Txt> : null}
    </Pressable>
  );
}

/* ── First-time sign-up: capture a name before the dashboard ── */
function Onboarding({ name, setName, error, saving, onSubmit }: {
  name: string; setName: (v: string) => void; error: string; saving: boolean; onSubmit: () => void;
}) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={s.obBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Stagger index={0} style={s.obIconWrap}>
          <View style={s.obIcon}><CapyMascot compact /></View>
        </Stagger>
        <Stagger index={1} style={s.obHeader}>
          <Txt variant="display" color={color.ink} style={s.centerText}>Welcome to Caresy</Txt>
          <Txt variant="body" color={color.muted} style={s.centerText}>What should we call you?</Txt>
          <Txt variant="caption" color={color.faint} style={s.centerText}>This is how your companion will greet you.</Txt>
        </Stagger>
        <Stagger index={2} style={s.obCard}>
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ananya Rao"
            autoCapitalize="words"
            error={error || null}
          />
          <Button title={saving ? 'Saving…' : 'Continue'} onPress={onSubmit} loading={saving} style={s.obBtn} />
          <Txt variant="caption" color={color.faint} style={s.centerText}>You can change this later in Profile.</Txt>
        </Stagger>
      </ScrollView>
    </Screen>
  );
}

/* ── Beautiful Auth (Q-learn + capy inspo) — signed-out login/registration screen ── */
function BeautifulAuth({ signingIn, appleAvailable, onGoogle, onApple }: {
  signingIn: boolean; appleAvailable: boolean; onGoogle: () => void; onApple: () => void;
}) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const isSignup = mode === 'signup';
  // Email/password form state — integrated into the existing card, not a separate screen
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);
  const cardIn = useRef(new Animated.Value(40)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const deco = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardIn, { toValue: 0, duration: 700, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 700, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(deco, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(deco, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [cardIn, cardOp, deco]);

  async function handleEmailAuth() {
    setEmailError(null);
    setConfirmationMsg(null);
    const e = email.trim().toLowerCase();
    if (!e || !/\S+@\S+\.\S+/.test(e)) { setEmailError('Enter a valid email'); return; }
    if (!password || password.length < 6) { setEmailError('Password must be at least 6 characters'); return; }
    if (isSignup && !fullName.trim()) { setEmailError('Full name is required'); return; }
    setEmailLoading(true);
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUpWithEmail(e, password, fullName);
        if (needsConfirmation) {
          setConfirmationMsg('Check your email to confirm your account, then log in.');
        }
      } else {
        await signInWithEmail(e, password);
      }
    } catch (err: any) {
      setEmailError(err?.message || 'Something went wrong');
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <View style={a.screen}>
      {/* top brand */}
      <View style={a.topBrand}>
        <Text style={a.brandStar}>✦</Text>
        <Text style={a.brandName}>Caresy</Text>
      </View>

      {/* medical touch — makes the "hospital companion" framing visible at a glance */}
      <View style={a.medicalBadge}>
        {Platform.OS === 'ios' && SymbolView ? (
          <SymbolView name="stethoscope" size={12} tintColor="#1B4D3E" />
        ) : (
          <Text style={a.medicalBadgeGlyph}>🩺</Text>
        )}
        <Text style={a.medicalBadgeTxt}>Verified hospital companions</Text>
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
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={a.cardScroll}>
        <View style={a.modeToggle}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('login'); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: !isSignup }}
            style={[a.modeSeg, !isSignup && a.modeSegOn]}
          >
            <Text style={!isSignup ? a.modeTxtOn : a.modeTxtOff}>Log in</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('signup'); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSignup }}
            style={[a.modeSeg, isSignup && a.modeSegOn]}
          >
            <Text style={isSignup ? a.modeTxtOn : a.modeTxtOff}>Sign up</Text>
          </Pressable>
        </View>

        <Text style={a.h1}>{isSignup ? 'Join thousands who\ntrust Caresy.' : 'Care you can\ntrust, instantly.'}</Text>
        <Text style={a.sub}>
          {isSignup
            ? 'Create your account in seconds. Queues, paperwork, pharmacy — we handle it, you stay with family.'
            : 'Book a trained hospital companion in minutes. Queues, paperwork, pharmacy — we handle it, you stay with family.'}
        </Text>

        {/* Email / password — lives inside the same card, toggled by Log in / Sign up */}
        <View style={a.emailForm}>
          {isSignup ? (
            <Field label="Full name" value={fullName} onChangeText={(v) => { setFullName(v); setEmailError(null); }} placeholder="e.g. Ananya Rao" autoCapitalize="words" />
          ) : null}
          <Field label="Email" value={email} onChangeText={(v) => { setEmail(v); setEmailError(null); setConfirmationMsg(null); }} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={null} />
          <Field label="Password" value={password} onChangeText={(v) => { setPassword(v); setEmailError(null); }} placeholder="At least 6 characters" secureTextEntry />
          {emailError ? <Text style={a.formError}>{emailError}</Text> : null}
          {confirmationMsg ? <Text style={a.formSuccess}>{confirmationMsg}</Text> : null}
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleEmailAuth(); }} disabled={emailLoading} style={({ pressed }) => [a.primaryBtn, a.emailBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }, emailLoading && { opacity: 0.7 }]}>
            <Text style={a.primaryTxt}>{emailLoading ? (isSignup ? 'Creating…' : 'Signing in…') : (isSignup ? 'Create account' : 'Log in')}</Text>
          </Pressable>
        </View>

        <View style={a.dividerRow}>
          <View style={a.divLine} />
          <Text style={a.divTxt}>or continue with</Text>
          <View style={a.divLine} />
        </View>

        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onGoogle(); }} disabled={signingIn} style={({ pressed }) => [a.secondaryBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
          {signingIn ? <Text style={a.secondaryTxt}>Signing in…</Text> : (
            <View style={a.btnRow}>
              <View style={a.gBadge}><Text style={a.gTxt}>G</Text></View>
              <Text style={a.secondaryTxt}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        {appleAvailable ? (
          // Native button: no `disabled` prop exists, so gate presses on the wrapper.
          <View pointerEvents={signingIn ? 'none' : 'auto'} style={signingIn ? { opacity: 0.6 } : undefined}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={26}
              style={a.appleBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onApple(); }}
            />
          </View>
        ) : null}

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
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const a = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#AEDFF5' },
  topBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 52, paddingBottom: 10 },
  brandStar: { fontSize: 16, color: '#1B4D3E', fontWeight: '800' },
  brandName: { fontSize: 16, color: '#1B4D3E', fontWeight: '800', letterSpacing: 0.6 },
  medicalBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6 },
  medicalBadgeGlyph: { fontSize: 12 },
  medicalBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#1B4D3E', letterSpacing: 0.2 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F3', borderRadius: 999, padding: 4, marginBottom: 4 },
  modeSeg: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modeSegOn: { backgroundColor: '#fff', ...shadow.card, shadowOpacity: 0.08, shadowRadius: 6 },
  modeTxtOn: { fontSize: 14, fontWeight: '800', color: '#1B4D3E' },
  modeTxtOff: { fontSize: 14, fontWeight: '700', color: '#8A968F' },
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
  // Apple's button renders natively and needs an explicit height; 52 matches
  // secondaryBtn so the stack keeps its rhythm. cornerRadius is set as a prop.
  appleBtn: { height: 52, width: '100%' },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  divLine: { flex: 1, height: 1, backgroundColor: '#E8ECE9' },
  divTxt: { fontSize: 12, color: '#9AA5A0', fontWeight: '600' },
  secondaryBtn: { minHeight: 52, borderRadius: 999, borderWidth: 1.5, borderColor: '#1B4D3E', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: '#1B4D3E' },
  legal: { textAlign: 'center', fontSize: 11, lineHeight: 16, color: '#9AA5A0', marginTop: 2 },
  link: { color: '#1B4D3E', fontWeight: '700' },
  cardScroll: { gap: 14, paddingBottom: 8 },
  emailForm: { gap: 12, marginTop: 4 },
  emailBtn: { marginTop: 2 },
  formError: { fontSize: 12, color: '#B3261E', fontWeight: '600', marginTop: -4 },
  formSuccess: { fontSize: 12, color: '#1B7A54', fontWeight: '600', marginTop: -4 },
  trustRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 2 },
  trustPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E7F2ED' },
  trustTxt: { fontSize: 11, fontWeight: '700', color: '#1B4D3E' },
});

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  flex1: { flex: 1 },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] }, // legacy
  pressedCard: { opacity: 0.97, transform: [{ scale: 0.97 }] },

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
  actionImgBox: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '64%', overflow: 'hidden' },
  actionImgFill: { width: '100%', height: '100%' },
  actionImgFade: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  // Fallback decor when no image
  actionDecor: { position: 'absolute', right: -8, bottom: -8, width: 96, height: 96, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  actionDecorUrgent: {},
  actionDecorGreen: {},
  actionDecorGlyph: { fontSize: 72, lineHeight: 72 },
  trustCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: 'rgba(192,201,195,0.35)' },
  trustHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trustBody: { lineHeight: 18 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  trustChip: { backgroundColor: color.greenTint, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(27,77,62,0.08)' },

  section: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  actionStagger: { width: '48%' },
  action: { width: '100%', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, height: 106, justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent' },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actionIos: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.06)' },
  actionAndroid: { backgroundColor: color.surface, borderColor: color.line, elevation: 1 },
  skeletonRow: { gap: space.sm },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: '#E8EDE9', width: '100%' },
  emptyCard: { alignItems: 'center', paddingVertical: space.xl, gap: space.sm },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.greenTint, alignItems: 'center', justifyContent: 'center' },
  emptyCta: { marginTop: space.sm, backgroundColor: color.green, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill },
  signOut: { marginTop: space.sm },

  obBody: { flexGrow: 1, padding: space.xl, gap: space.xl, justifyContent: 'center', paddingBottom: space.xxl, paddingTop: space.xxl },
  obIconWrap: { alignItems: 'center', marginBottom: space.sm },
  obIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: color.greenTint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(27,77,62,0.08)' },
  obHeader: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg },
  obCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.xl, gap: space.lg, borderWidth: 1, borderColor: color.line, ...shadow.card },
  obBtn: { alignSelf: 'stretch' },
});
