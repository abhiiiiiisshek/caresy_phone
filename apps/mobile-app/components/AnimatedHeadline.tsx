import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  AppState,
  Easing,
  StyleSheet,
  Text,
  View,
  Pressable,
  AccessibilityInfo,
  NativeModules,
  Platform,
} from 'react-native';
import { color } from '../lib/theme';

type GestureKey = 'wave' | 'smile' | 'heart' | 'flex' | 'hug' | 'clap' | 'namaste';
type Header = [string, GestureKey];

// Fallback pools — overridden by server-driven /welcome-copy.json when available
const HEADERS_ANYTIME: Header[] = [
  ['Stay hydrated,', 'smile'],
  ['Breathe easy,', 'smile'],
  ['Take care,', 'heart'],
  ['Keep well,', 'smile'],
  ['You’ve got this,', 'flex'],
  ['Good to see you,', 'wave'],
  ['Sending strength,', 'flex'],
  ['Stay strong,', 'flex'],
  ['Wishing you health,', 'namaste'],
  ['One step at a time,', 'clap'],
  ['Here for you,', 'hug'],
  ['You’re not alone,', 'hug'],
  ['Hope you’re well,', 'wave'],
  ['Small steps count,', 'clap'],
  ['Health comes first,', 'heart'],
  ['We’re by your side,', 'hug'],
  ['Stay steady,', 'flex'],
  ['Be kind to yourself,', 'heart'],
  ['Every day counts,', 'clap'],
  ['Healing takes time,', 'heart'],
  ['Glad you’re here,', 'wave'],
  ['Welcome back,', 'wave'],
  ['Care starts here,', 'heart'],
  ['Your health matters,', 'heart'],
  ['Proud of you,', 'clap'],
  ['Well done today,', 'clap'],
];
const HEADERS_MORNING: Header[] = [
  ['Good morning,', 'wave'],
  ['Rise gently,', 'smile'],
  ['Fresh start,', 'smile'],
  ['A calm morning,', 'namaste'],
  ['Morning sunshine,', 'wave'],
  ['New day, new strength,', 'flex'],
];
const HEADERS_AFTERNOON: Header[] = [
  ['Good afternoon,', 'wave'],
  ['Keep going,', 'flex'],
  ['Halfway there,', 'clap'],
  ['Take a breather,', 'smile'],
  ['Pace yourself,', 'smile'],
];
const HEADERS_EVENING: Header[] = [
  ['Good evening,', 'wave'],
  ['Rest well,', 'smile'],
  ['Wind down gently,', 'smile'],
  ['You did enough today,', 'clap'],
  ['A quiet evening,', 'namaste'],
  ['Sleep comes soon,', 'smile'],
];
const BOOKING_HEADERS: Header[] = [
  ['Your visit is set,', 'namaste'],
  ['See you soon,', 'wave'],
  ['Your companion’s ready,', 'namaste'],
  ['All set for your visit,', 'clap'],
  ['We’re ready for you,', 'hug'],
  ['Visit day is near,', 'smile'],
  ['We’ll be there,', 'hug'],
  ['Everything’s arranged,', 'clap'],
];
const POST_VISIT_HEADERS: Header[] = [
  ['Hope you’re recovering well,', 'heart'],
  ['Healing on track,', 'smile'],
  ['Rest and recover,', 'hug'],
  ['Glad we could help,', 'clap'],
  ['Your next check-in soon,', 'wave'],
];

const EMOJI: Record<GestureKey, string> = {
  wave: '👋',
  smile: '😊',
  heart: '❤️',
  flex: '💪',
  hug: '🤗',
  clap: '👏',
  namaste: '🙏',
};

function getLocale(): 'hi' | 'en' {
  try {
    const iosLocale = (NativeModules.SettingsManager?.settings?.AppleLocale as string) ||
      (NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] as string);
    const androidLocale = NativeModules.I18nManager?.localeIdentifier as string | undefined;
    const loc = (iosLocale || androidLocale || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : 'en')) as string;
    return loc.toLowerCase().startsWith('hi') ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

function toHeaders(list: string[] | undefined, fallback: GestureKey = 'smile'): Header[] {
  if (!list?.length) return [];
  return list.map((t) => [t, fallback] as Header);
}

function headerPool(hour: number, hasUpcoming: boolean, hasPastVisit = false, locale: 'hi' | 'en' = 'en', override?: any): Header[] {
  if (override?.[locale]) {
    const o = override[locale];
    const anytime = toHeaders(o.anytime, 'smile');
    const morning = toHeaders(o.morning, 'wave');
    const afternoon = toHeaders(o.afternoon, 'wave');
    const evening = toHeaders(o.evening, 'wave');
    const booking = toHeaders(o.booking, 'namaste');
    const postVisit = toHeaders(o.postVisit, 'heart');
    const timePool = hour < 12 ? morning : hour < 17 ? afternoon : evening;
    if (anytime.length) {
      const pool = [...anytime, ...timePool, ...timePool];
      if (hasUpcoming && booking.length) return [...pool, ...booking, ...booking];
      if (hasPastVisit && !hasUpcoming && postVisit.length) return [...pool, ...postVisit];
      return pool;
    }
  }
  if (locale === 'hi') {
    const HI_ANYTIME: Header[] = [['स्वागत है,', 'wave'], ['ख्याल रखिए,', 'heart'], ['आप अकेले नहीं हैं,', 'hug'], ['सेहत सबसे पहले,', 'heart']];
    const HI_MORNING: Header[] = [['सुप्रभात,', 'wave'], ['नया दिन, नई ऊर्जा,', 'flex']];
    const HI_EVENING: Header[] = [['शुभ संध्या,', 'wave'], ['आराम कीजिए,', 'smile']];
    const timePool = hour < 12 ? HI_MORNING : hour < 17 ? HEADERS_AFTERNOON : HI_EVENING;
    const pool = [...HI_ANYTIME, ...timePool, ...timePool];
    if (hasUpcoming) return [...pool, ...BOOKING_HEADERS, ...BOOKING_HEADERS];
    if (hasPastVisit) return [...pool, ...POST_VISIT_HEADERS];
    return pool;
  }
  const timePool = hour < 12 ? HEADERS_MORNING : hour < 17 ? HEADERS_AFTERNOON : HEADERS_EVENING;
  const pool = [...HEADERS_ANYTIME, ...timePool, ...timePool];
  if (hasUpcoming) return [...pool, ...BOOKING_HEADERS, ...BOOKING_HEADERS];
  if (hasPastVisit && !hasUpcoming) return [...pool, ...POST_VISIT_HEADERS];
  return pool;
}

function pickNext(pool: Header[], current: string | null): Header {
  if (!pool.length) return ['Hi,', 'wave'];
  if (pool.length === 1) return pool[0];
  let next = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (current && next[0] === current && guard < 8) {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  }
  return next;
}

function logPhraseView(phrase: string) {
  if (__DEV__) console.debug('[caresy] welcome phrase:', phrase);
}

type Props = {
  name: string;
  hasUpcoming?: boolean;
  hasPastVisit?: boolean;
  intervalMs?: number;
  maxCycles?: number;
};

// Local fallback bundled with app — server fetch overrides interval/maxCycles/locale pools
let bundledOverride: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  bundledOverride = require('../assets/welcome-copy.json');
} catch {}

export function AnimatedHeadline({ name, hasUpcoming = false, hasPastVisit = false, intervalMs: propInterval, maxCycles: propMax }: Props) {
  const locale = getLocale();
  const [override, setOverride] = useState<any>(bundledOverride);
  const [intervalMs, setIntervalMs] = useState(propInterval ?? bundledOverride?.intervalMs ?? 3400);
  const [maxCycles, setMaxCycles] = useState(propMax ?? bundledOverride?.maxCycles ?? 6);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pausedByPress, setPausedByPress] = useState(false);

  // Server-driven fetch (with bundled fallback)
  useEffect(() => {
    let cancelled = false;
    // Try remote, fall back to bundled
    fetch('https://caresy.co.in/welcome-copy.json', { cache: 'no-store' } as any)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setOverride(j);
        if (typeof j.intervalMs === 'number') setIntervalMs(j.intervalMs);
        if (typeof j.maxCycles === 'number') setMaxCycles(j.maxCycles);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduceMotion(!!v));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged' as any, setReduceMotion as any);
    return () => (sub as any)?.remove?.();
  }, []);

  const poolRef = useRef<Header[]>(headerPool(new Date().getHours(), hasUpcoming, hasPastVisit, locale, override));
  const initial = pickNext(poolRef.current, null);
  const [phrase, setPhrase] = useState<string>(initial[0]);
  const [gesture] = useState<GestureKey>(initial[1]);
  const phraseRef = useRef(phrase);
  const pausedByPressRef = useRef(false);
  useEffect(() => { phraseRef.current = phrase; }, [phrase]);
  useEffect(() => { pausedByPressRef.current = pausedByPress; }, [pausedByPress]);

  useEffect(() => {
    poolRef.current = headerPool(new Date().getHours(), hasUpcoming, hasPastVisit, locale, override);
  }, [hasUpcoming, hasPastVisit, locale, override]);

  useEffect(() => { logPhraseView(initial[0]); }, []); // analytics: first view

  const anim = useRef(new Animated.Value(1)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [iconPulse, reduceMotion]);

  const animateTo = useCallback(
    (nextPhrase: string) => {
      if (reduceMotion) {
        // still shuffle, but with simple fade — respects reduce-motion without going static
        setPhrase(nextPhrase);
        logPhraseView(nextPhrase);
        // gentle opacity fade only
        anim.setValue(0);
        Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
        return;
      }
      Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        setPhrase(nextPhrase);
        logPhraseView(nextPhrase);
        Animated.timing(anim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    },
    [anim, reduceMotion]
  );

  // Active auto mode — continuous shuffle, pause on long-press & background, resume with delay
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    let appState = AppState.currentState;
    let cycles = 0;
    // use the component-level pausedByPressRef (kept in sync via effect above)
    const tick = () => {
      if (pausedByPressRef.current || AppState.currentState !== 'active') return;
      if (maxCycles !== Infinity && cycles >= maxCycles) {
        if (id) { clearInterval(id); id = null; }
        return;
      }
      const [nextPhrase] = pickNext(poolRef.current, phraseRef.current);
      cycles += 1;
      animateTo(nextPhrase);
    };

    const start = () => {
      if (id || (maxCycles !== Infinity && cycles >= maxCycles)) return;
      id = setInterval(tick, intervalMs);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };

    start();
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.match(/inactive|background/) && next === 'active') {
        if (resumeTimeout) clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => { if ((maxCycles === Infinity || cycles < maxCycles) && !pausedByPressRef.current) tick(); }, 1500);
        start();
      } else if (next.match(/inactive|background/)) {
        stop();
      }
      appState = next;
    });
    return () => {
      stop();
      if (resumeTimeout) clearTimeout(resumeTimeout);
      sub.remove();
    };
  }, [animateTo, intervalMs, maxCycles]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const content = (
    <View style={s.row}>
      <View style={s.textCol}>
        <Animated.View style={reduceMotion ? { opacity } : { opacity, transform: [{ translateY }, { scale }] }}>
          <Text style={s.phrase} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
            {phrase}
          </Text>
        </Animated.View>
        <Text style={s.name} numberOfLines={1}>
          {name}.
        </Text>
        <View style={s.dots} accessible={false}>
          <View style={s.dotActive} />
          <View style={s.dot} />
          <View style={s.dot} />
        </View>
      </View>
      <Animated.View style={[s.badge, !reduceMotion && { transform: [{ scale: iconPulse }] }]}>
        <Text style={s.emoji} accessibilityLabel="greeting icon">{EMOJI[gesture]}</Text>
      </Animated.View>
    </View>
  );

  // Pause on long-press (improvement #2) — gesture stays static, works with reduce-motion too
  return (
    <Pressable
      onPressIn={() => setPausedByPress(true)}
      onPressOut={() => setPausedByPress(false)}
      delayLongPress={200}
      onLongPress={() => setPausedByPress(true)}
      style={s.wrap}
      accessibilityLabel="Welcome message, long press to pause"
    >
      {content}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { minHeight: 96 }, // avoid layout shift
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 96 },
  textCol: { flex: 1, gap: 2 },
  phrase: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: color.greenDeep, letterSpacing: -0.3 },
  name: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: color.ink, letterSpacing: -0.3 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6, opacity: 0.5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.lineStrong },
  dotActive: { width: 14, height: 4, borderRadius: 2, backgroundColor: color.green },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF1EC',
    borderWidth: 1,
    borderColor: 'rgba(192,201,195,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 28, lineHeight: 32 },
});
