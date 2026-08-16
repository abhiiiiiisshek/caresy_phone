'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

function headerPool(hour: number, hasUpcoming: boolean): Header[] {
  const timePool = hour < 12 ? HEADERS_MORNING : hour < 17 ? HEADERS_AFTERNOON : HEADERS_EVENING;
  // Double the time-of-day pool so those phrases stay common, not drowned out.
  const pool = [...HEADERS_ANYTIME, ...timePool, ...timePool];
  return hasUpcoming ? [...pool, ...BOOKING_HEADERS, ...BOOKING_HEADERS] : pool;
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

  // Pick a rotating greeting phrase client-side (once per load) so the header
  // feels personal without an SSR/client hydration mismatch. The pool is
  // time-of-day aware; booking phrases join when a real upcoming visit exists.
  const hasUpcoming = !!activeBooking?.scheduled_start_time && activeBooking.booking_type !== 'INSTANT';
  useEffect(() => {
    const pool = headerPool(new Date().getHours(), hasUpcoming);
    const [text, gesture] = pool[Math.floor(Math.random() * pool.length)];
    setHeaderPhrase(text);
    setAvatarGesture(gesture);
    setNoNameLine(NO_NAME_LINES[Math.floor(Math.random() * NO_NAME_LINES.length)]);
  }, [hasUpcoming]);

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

          {/* Greeting — text left, animated emoji avatar filling the blank space on the right */}
          <div style={{ padding: '8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 32, lineHeight: '40px', color: 'var(--m3-ink)' }}>
              {header}<br />{firstName ? `${firstName}.` : noNameLine}
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

          {/* Our services — marvel depth: elevated chip cards with hover lift */}
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionTitle action="See all" actionHref="/services">Our Services</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {SERVICE_CHIPS.map((c) => {
                const external = c.href.startsWith('http');
                const inner = (
                  <>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,54,41,0.08)', color: 'var(--m3-green)' }}>
                      <c.icon style={{ width: 20, height: 20 }} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.2px', color: 'var(--m3-ink)', textAlign: 'center' }}>{c.label}</span>
                    {c.note && <span style={{ fontSize: 10, color: 'var(--m3-muted)', textAlign: 'center', lineHeight: 1.3 }}>{c.note}</span>}
                  </>
                );
                const style: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', borderRadius: 16, background: 'var(--m3-chip)', textDecoration: 'none', minHeight: 120, boxSizing: 'border-box', border: '1px solid rgba(192,201,195,0.35)', transition: 'transform 160ms ease, box-shadow 160ms ease' };
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
