'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import HealthTips from '@/components/HealthTips';
import { Reveal } from '@caresy/ui';
import { HeroGesture, type GestureKey } from '@/lib/heroGestures';
import {
  Bell, Zap, Calendar, CalendarDays, Users, FileText, ArrowRight,
  ClipboardCheck, ChevronRight, BadgeCheck, BriefcaseMedical,
  MapPin, Clock, User, Navigation, HeartPulse,
} from 'lucide-react';

const SUPPORT_WA = '919717500225';
const EPILOGUE = 'var(--font-epilogue), sans-serif';

interface ActiveBookingInfo {
  reference_code: string;
  share_token: string;
  status: string;
  scheduled_start_time?: string | null;
  booking_type?: string | null;
  pickup_location?: { title?: string } | null;
  patient?: { full_name?: string } | null;
  service_metadata?: { companion?: { name?: string; photo?: string } };
}

// ACCEPTED is what a companion self-accepting writes; ASSIGNED is the admin
// board's word for the same thing. Only the second was listed, so the normal
// path left the home screen with no live card at all.
const ACTIVE_STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Companion confirmed', ASSIGNED: 'Companion on the way', IN_PROGRESS: 'Visit in progress',
};

function fmtWhen(b: ActiveBookingInfo): string {
  if (b.booking_type === 'INSTANT') return 'Same-day visit';
  if (!b.scheduled_start_time) return 'Time to be confirmed';
  return new Date(b.scheduled_start_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Each header phrase names the gesture that fits it — rendered as a Phosphor
// duotone icon animated with Motion One (see heroGestures.tsx).
type Header = [string, GestureKey];

// Short, warm greeting phrases rotated client-side each visit so the header
// feels personal, each paired with a matching gesture. Pools are time-of-day
// aware; booking-aware phrases join when a real upcoming visit exists.
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

// Join the pool only when a real upcoming (scheduled, non-instant) booking exists.
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

// Second-line fallbacks when we don't know the visitor's name.
const NO_NAME_LINES = ['welcome.', 'friend.', 'we’re here.', 'take a seat.', 'you matter.'];

// --- Improvement: personalized post-visit phrases, localization, server-driven override ---

const POST_VISIT_HEADERS: Header[] = [
  ['Hope you’re recovering well,', 'heart'],
  ['Healing on track,', 'smile'],
  ['Rest and recover,', 'hug'],
  ['Glad we could help,', 'clap'],
  ['Your next check-in soon,', 'wave'],
];

function getUserLocale(): 'hi' | 'en' {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || 'en').toLowerCase();
  return lang.startsWith('hi') ? 'hi' : 'en';
}

// Maps server JSON strings to Header pairs — gesture defaults to 'smile' unless
// the string clearly matches a known gesture intent. Keeps server copy simple.
function toHeaders(list: string[] | undefined, fallbackGesture: GestureKey = 'smile'): Header[] {
  if (!list || !list.length) return [];
  return list.map((t) => [t, fallbackGesture] as Header);
}

function headerPool(hour: number, hasUpcoming: boolean, hasPastVisit = false, locale: 'hi' | 'en' = 'en', override?: any): Header[] {
  // Server-driven override (fetch /welcome-copy.json) — analytics: log view via console
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
  // Local fallback — mirrors original behaviour, now with post-visit + locale
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

// Analytics helper — fire-and-forget, no PII
function logPhraseView(phrase: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) (window as any).gtag('event', 'welcome_phrase_view', { phrase });
    // also console for debugging + future Supabase insert: bookings?.phrase_analytics
    console.debug('[caresy] welcome phrase:', phrase);
  } catch {}
}

const SERVICE_CHIPS = [
  { icon: Users, label: 'Companions', href: '/booking' },
  { icon: CalendarDays, label: 'Appointments', href: '/booking' },
  { icon: FileText, label: 'Custom Care Plan', href: `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('Hi Caresy, I would like a custom care plan.')}`, note: 'Redirects to WhatsApp' },
];

function SectionTitle({ children, action, actionHref }: { children: React.ReactNode; action?: string; actionHref?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>{children}</h3>
      {action && actionHref && (
        <Link href={actionHref} style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', color: 'var(--m3-green-deep)', textDecoration: 'none' }}>{action}</Link>
      )}
    </div>
  );
}

function ActionCard({ href, bg, ink, btnBg, label, labelIcon: LabelIcon, title, desc, decorIcon: DecorIcon, img, imgAlt }: {
  href: string; bg: string; ink: string; btnBg: string; label: string;
  labelIcon: React.ElementType; title: string; desc: string; decorIcon: React.ElementType;
  img?: string; imgAlt?: string;
}) {
  return (
    <Link href={href} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: 132, padding: 20, borderRadius: 'var(--m3-radius-card)', background: bg, overflow: 'hidden', textDecoration: 'none', boxSizing: 'border-box' }}>
      {img ? (
        <>
          {/* Photo bleeds off the right edge, faded into the card colour so the copy stays legible. */}
          <span aria-hidden role="img" aria-label={imgAlt} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '64%', backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <span aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${bg} 0%, ${bg} 36%, transparent 84%)` }} />
        </>
      ) : (
        <DecorIcon aria-hidden style={{ position: 'absolute', right: -16, bottom: -16, width: 128, height: 128, color: ink, opacity: 0.12 }} />
      )}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 210 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: ink }}>
          <LabelIcon style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</span>
        </span>
        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700, color: ink }}>{title}</span>
        <span style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: ink, opacity: 0.9 }}>{desc}</span>
      </span>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: btnBg, color: '#fff', flexShrink: 0, zIndex: 1 }}>
        <ArrowRight style={{ width: 16, height: 16 }} />
      </span>
    </Link>
  );
}

export default function Home() {
  const { user, profile } = useAuth();
  const [activeBooking, setActiveBooking] = useState<ActiveBookingInfo | null>(null);
  const [headerPhrase, setHeaderPhrase] = useState<string | null>(null);
  const [noNameLine, setNoNameLine] = useState('welcome.');
  const [avatarGesture, setAvatarGesture] = useState<GestureKey | null>(null);

  useEffect(() => {
    if (!user) { setActiveBooking(null); return; }
    const supabase = createClient();
    supabase
      .from('bookings')
      .select('reference_code, share_token, status, scheduled_start_time, booking_type, service_metadata, pickup_location:locations!pickup_location_id (title), patient:patients!patient_id (full_name)')
      .in('status', ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setActiveBooking(data[0] as unknown as ActiveBookingInfo);
        else setActiveBooking(null);
      });
  }, [user]);

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string);
  const firstName = displayName ? displayName.split(' ')[0] : null;
  const initial = firstName ? firstName.charAt(0).toUpperCase() : 'C';
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || (user?.user_metadata?.picture as string) || null;
  const companion = activeBooking?.service_metadata?.companion;

  // --- Greeting improvements: server-driven, localized, personalized, reduced-motion, pause, cap ---
  const [hasPastVisit, setHasPastVisit] = useState(false);
  const [welcomeOverride, setWelcomeOverride] = useState<any>(null);
  const [welcomeIntervalMs, setWelcomeIntervalMs] = useState(3400);
  const [welcomeMaxCycles, setWelcomeMaxCycles] = useState(6);
  const [isHovered, setIsHovered] = useState(false);
  const greetingRef = useRef<HTMLDivElement>(null);
  const pausedByHoverRef = useRef(false);
  const cycleRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) Server-driven copy: fetch /welcome-copy.json (no-store, fallback to local pools)
  useEffect(() => {
    fetch('/welcome-copy.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setWelcomeOverride(j);
        if (typeof j.intervalMs === 'number') setWelcomeIntervalMs(j.intervalMs);
        if (typeof j.maxCycles === 'number') setWelcomeMaxCycles(j.maxCycles);
      })
      .catch(() => {});
  }, []);

  // 5) Personalized: detect past visit (completed bookings) for post-visit pool
  useEffect(() => {
    if (!user) { setHasPastVisit(false); return; }
    const supabase = createClient();
    supabase.from('bookings').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      setHasPastVisit(!!data && data.length > 0 && !activeBooking);
    });
  }, [user, activeBooking]);

  const hasUpcoming = !!activeBooking?.scheduled_start_time && activeBooking.booking_type !== 'INSTANT';
  const locale = typeof window !== 'undefined' ? getUserLocale() : 'en';
  const poolRef = useRef<Header[] | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setPrefersReducedMotion(m.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    m.addEventListener?.('change', onChange);
    return () => m.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    poolRef.current = headerPool(hour, hasUpcoming, hasPastVisit, locale, welcomeOverride);
    const pick = () => {
      const pool = poolRef.current!;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    const [firstText, firstGesture] = pick();
    setHeaderPhrase(firstText);
    setAvatarGesture(firstGesture);
    logPhraseView(firstText);
    setNoNameLine(NO_NAME_LINES[Math.floor(Math.random() * NO_NAME_LINES.length)]);

    // 1) Respect reduced motion — no auto-shuffle
    if (prefersReducedMotion) return;

    // 3+4) Visibility-aware + cap after maxCycles + pause on hover/focus
    let prev = firstText;
    cycleRef.current = 0;
    const tick = () => {
      if (pausedByHoverRef.current || document.hidden) return;
      if (cycleRef.current >= welcomeMaxCycles) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }
      const pool = poolRef.current!;
      let next = pick();
      let guard = 0;
      while (next[0] === prev && guard < 8) { next = pick(); guard++; }
      prev = next[0];
      cycleRef.current += 1;
      setHeaderPhrase(next[0]);
      logPhraseView(next[0]);
    };
    intervalRef.current = setInterval(tick, welcomeIntervalMs);

    // 3) Resume with 1.5s delay after tab returns (avoid flash)
    const onVis = () => {
      if (document.hidden) return;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        if (cycleRef.current < welcomeMaxCycles && !pausedByHoverRef.current) tick();
      }, 1500);
    };
    document.addEventListener('visibilitychange', onVis);

    // 8) Cap when scrolled past greeting (IntersectionObserver)
    let obs: IntersectionObserver | null = null;
    if (greetingRef.current && 'IntersectionObserver' in window) {
      obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && intervalRef.current) {
          clearInterval(intervalRef.current); intervalRef.current = null;
        } else if (entry.isIntersecting && !intervalRef.current && cycleRef.current < welcomeMaxCycles && !prefersReducedMotion) {
          intervalRef.current = setInterval(tick, welcomeIntervalMs);
        }
      }, { threshold: 0 });
      obs.observe(greetingRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      document.removeEventListener('visibilitychange', onVis);
      obs?.disconnect();
    };
  }, [hasUpcoming, hasPastVisit, locale, welcomeOverride, prefersReducedMotion, welcomeIntervalMs, welcomeMaxCycles]);

  // keep pause ref in sync with hover state
  useEffect(() => { pausedByHoverRef.current = isHovered; }, [isHovered]);

  // Falls back to the plain time-of-day greeting on the server / first paint.
  const header = headerPhrase || `${greeting()},`;

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', fontFamily: EPILOGUE, minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto' }}>

        {/* Top app bar — safe-area padding keeps the bell clear of the status bar in the native app */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, padding: 'calc(env(safe-area-inset-top, 0px) + 4px) 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/profile" aria-label="Your profile" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--m3-green)', padding: 2, boxSizing: 'border-box', textDecoration: 'none' }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', fontWeight: 800, fontSize: 14 }}>{initial}</span>
              )}
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/caresy-logo.png" alt="Caresy" style={{ height: 32, width: 'auto' }} />
          </div>
          <Link href="/my-bookings" aria-label="Notifications" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--m3-ink)' }}>
            <Bell style={{ width: 20, height: 20 }} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '16px 16px 0' }}>

          {/* Greeting — message shuffles (gesture fixed), pauses on hover/focus, capped */}
          <div
            ref={greetingRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            tabIndex={0}
            aria-live="polite"
            style={{ padding: '8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, outline: 'none', minHeight: 96 }}
          >
            <p style={{ margin: 0, fontSize: 32, lineHeight: '40px', color: 'var(--m3-ink)', minHeight: 80 }}>
              <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
                {prefersReducedMotion ? (
                  <span style={{ display: 'inline-block' }}>{header}</span>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={header}
                      initial={{ y: 16, opacity: 0, filter: 'blur(4px)' }}
                      animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ y: -16, opacity: 0, filter: 'blur(4px)' }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: 'inline-block' }}
                    >
                      {header}
                    </motion.span>
                  </AnimatePresence>
                )}
              </span>
              <br />{firstName ? `${firstName}.` : noNameLine}
            </p>
            {avatarGesture && (
              <span style={{ display: 'grid', placeItems: 'center', width: 96, height: 96, borderRadius: '50%', background: 'var(--m3-surface, #eef1ec)', border: '1px solid var(--m3-line, #e1e3de)', flexShrink: 0 }}>
                <HeroGesture gesture={avatarGesture} size={56} />
              </span>
            )}
          </div>

          {/* Brand hero — the marketing front door, shown only to signed-out visitors */}
          {!user && (
            <Reveal style={{ padding: '16px 18px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
              <p style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 700, color: 'var(--m3-ink)' }}>
                Be there, even when you can’t be.
              </p>
              <p style={{ margin: '5px 0 12px', fontSize: 13.5, lineHeight: '20px', color: 'var(--m3-muted)' }}>
                Verified hospital companions in Noida &amp; Greater Noida — they attend the visit, keep your family updated live, and stay until it’s done.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { icon: BadgeCheck, text: '6-check verified' },
                  { icon: Navigation, text: 'Live updates' },
                  { icon: Clock, text: 'Same-day help' },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'var(--success-soft, #e7f0ea)', color: 'var(--m3-green)', fontSize: 12, fontWeight: 700 }}>
                    <Icon style={{ width: 13, height: 13 }} />{text}
                  </span>
                ))}
              </div>
            </Reveal>
          )}

          {/* Active booking card — only when a real assigned/in-progress booking exists */}
          {activeBooking && (
            <div role="status" style={{ padding: 16, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Companion + status */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {companion?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companion.photo} alt={`Companion ${companion.name}`} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>
                    {(companion?.name || 'C').charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 15, color: 'var(--m3-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {companion?.name || 'Your companion'}
                  </strong>
                  <div style={{ fontSize: 12, color: 'var(--m3-muted)', marginTop: 1 }}>Booking {activeBooking.reference_code}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'var(--success-soft, #e7f0ea)', color: 'var(--m3-green)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
                  {ACTIVE_STATUS_LABEL[activeBooking.status] || activeBooking.status}
                </span>
              </div>

              {/* Details: hospital, patient, time */}
              <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--m3-muted)' }}>
                {activeBooking.pickup_location?.title && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MapPin style={{ width: 15, height: 15, flexShrink: 0 }} />{activeBooking.pickup_location.title}</span>
                )}
                {activeBooking.patient?.full_name && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><User style={{ width: 15, height: 15, flexShrink: 0 }} />{activeBooking.patient.full_name}</span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Clock style={{ width: 15, height: 15, flexShrink: 0 }} />{fmtWhen(activeBooking)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href={`/tracking?t=${activeBooking.share_token}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <Navigation style={{ width: 16, height: 16 }} />Track live
                </Link>
                <Link href="/my-bookings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 18px', borderRadius: 999, background: 'transparent', border: '1px solid var(--m3-line)', color: 'var(--m3-ink)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  Details<ChevronRight style={{ width: 15, height: 15 }} />
                </Link>
              </div>
            </div>
          )}

          {/* Primary actions */}
          <Reveal delay={0.05} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ActionCard
              href="/quick-help"
              bg="var(--m3-urgent-bg)" ink="var(--m3-urgent-ink)" btnBg="var(--m3-urgent)"
              label="Immediate need" labelIcon={Zap}
              title="Urgent Booking"
              desc="Find a companion for last-minute emergencies."
              decorIcon={BriefcaseMedical}
              img="/assets/caresy-hospital-support.webp" imgAlt="Caresy companion assisting a patient in a wheelchair"
            />
            <ActionCard
              href="/booking"
              bg="var(--m3-green)" ink="var(--m3-green-soft)" btnBg="var(--m3-green-deep)"
              label="Plan ahead" labelIcon={Calendar}
              title="Schedule Appointment"
              desc="Book a companion for a future medical visit."
              decorIcon={CalendarDays}
              img="/assets/caresy-family-app.webp" imgAlt="Care Journey timeline on a phone in a hospital corridor"
            />
          </Reveal>

          {/* Our services */}
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionTitle action="See all" actionHref="/services">Our Services</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {SERVICE_CHIPS.map((c) => {
                const external = c.href.startsWith('http');
                const inner = (
                  <>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', color: 'var(--m3-green)' }}>
                      <c.icon style={{ width: 20, height: 20 }} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-ink)', textAlign: 'center' }}>{c.label}</span>
                    {c.note && <span style={{ fontSize: 10, color: 'var(--m3-muted)', textAlign: 'center' }}>{c.note}</span>}
                  </>
                );
                const style: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', borderRadius: 12, background: 'var(--m3-chip)', textDecoration: 'none', minHeight: 118, boxSizing: 'border-box' };
                return external ? (
                  <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" style={style}>{inner}</a>
                ) : (
                  <Link key={c.label} href={c.href} style={style}>{inner}</Link>
                );
              })}
            </div>
          </Reveal>

          {/* Recommended */}
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionTitle>Recommended for you</SectionTitle>

            <HealthTips />

            <Link href="/care" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 17, borderRadius: 12, background: 'var(--m3-card)', textDecoration: 'none' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 8, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', flexShrink: 0 }}>
                <HeartPulse style={{ width: 20, height: 20 }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', color: 'var(--m3-ink)' }}>Care timeline</span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>Visits, medicines and reports in one place</span>
              </span>
              <ChevronRight style={{ width: 16, height: 16, color: 'var(--m3-muted)', flexShrink: 0 }} />
            </Link>

            <Link href="/how-it-works" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 17, borderRadius: 12, background: 'var(--m3-card)', textDecoration: 'none' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 8, background: 'var(--m3-amber)', color: 'var(--m3-ink)', flexShrink: 0 }}>
                <ClipboardCheck style={{ width: 20, height: 20 }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', color: 'var(--m3-ink)' }}>Prepare for your visit</span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>Checklist for your upcoming appointment</span>
              </span>
              <ChevronRight style={{ width: 16, height: 16, color: 'var(--m3-muted)', flexShrink: 0 }} />
            </Link>

          </Reveal>

          {/* Trust & safety */}
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid rgba(192,201,195,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BadgeCheck style={{ width: 22, height: 22, color: 'var(--m3-green)' }} />
              <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>Verified Companions</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: '23px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
              Your safety is our priority. All Caresy companions undergo strict background checks, interviews, and professional certification reviews.
            </p>
            <Link href="/trust" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', color: 'var(--m3-green-deep)', textDecoration: 'none' }}>Learn about our screening</Link>
          </Reveal>

        </div>
      </div>
    </main>
  );
}
