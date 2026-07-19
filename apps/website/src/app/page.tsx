'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import {
  Bell, Zap, Calendar, CalendarDays, Users, FileText, ArrowRight,
  ClipboardCheck, ChevronRight, BookOpen, BadgeCheck, BriefcaseMedical,
} from 'lucide-react';

const SUPPORT_WA = '919717500225';
const EPILOGUE = 'var(--font-epilogue), sans-serif';

interface ActiveBookingInfo {
  reference_code: string;
  status: string;
  pickup_location?: { title?: string } | null;
  service_metadata?: { companion?: { name?: string; photo?: string } };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

function ActionCard({ href, bg, ink, btnBg, label, labelIcon: LabelIcon, title, desc, decorIcon: DecorIcon }: {
  href: string; bg: string; ink: string; btnBg: string; label: string;
  labelIcon: React.ElementType; title: string; desc: string; decorIcon: React.ElementType;
}) {
  return (
    <Link href={href} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 20, borderRadius: 'var(--m3-radius-card)', background: bg, overflow: 'hidden', textDecoration: 'none', boxSizing: 'border-box' }}>
      <DecorIcon aria-hidden style={{ position: 'absolute', right: -16, bottom: -16, width: 128, height: 128, color: ink, opacity: 0.12 }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 250 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: ink }}>
          <LabelIcon style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</span>
        </span>
        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700, color: ink }}>{title}</span>
        <span style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: ink, opacity: 0.9 }}>{desc}</span>
      </span>
      <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: btnBg, color: '#fff', flexShrink: 0, zIndex: 1 }}>
        <ArrowRight style={{ width: 16, height: 16 }} />
      </span>
    </Link>
  );
}

export default function Home() {
  const { user, profile } = useAuth();
  const [activeBooking, setActiveBooking] = useState<ActiveBookingInfo | null>(null);

  useEffect(() => {
    if (!user) { setActiveBooking(null); return; }
    const supabase = createClient();
    supabase
      .from('bookings')
      .select('reference_code, status, service_metadata, pickup_location:locations!pickup_location_id (title)')
      .in('status', ['ASSIGNED', 'IN_PROGRESS'])
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

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', fontFamily: EPILOGUE, minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto' }}>

        {/* Top app bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 16px' }}>
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

          {/* Greeting */}
          <div style={{ padding: '8px 0 0' }}>
            <p style={{ margin: 0, fontSize: 32, lineHeight: '40px', color: 'var(--m3-ink)' }}>
              {greeting()},{firstName ? <><br />{firstName}.</> : <><br />welcome.</>}
            </p>
          </div>

          {/* Active booking banner — only when a real assigned/in-progress booking exists */}
          {activeBooking && (
            <Link href="/my-bookings" style={{ textDecoration: 'none' }}>
              <div role="status" style={{ padding: 16, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', display: 'flex', gap: 12, alignItems: 'center' }}>
                {companion?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companion.photo} alt={`Companion ${companion.name}`} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>
                    {(companion?.name || 'C').charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                    <strong style={{ fontSize: 14, color: 'var(--m3-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {companion?.name ? `${companion.name} is on the way` : 'Companion assigned'}
                      {activeBooking.pickup_location?.title ? ` · ${activeBooking.pickup_location.title}` : ''}
                    </strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--m3-muted)', marginTop: 2 }}>Booking {activeBooking.reference_code}</div>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: 'var(--m3-muted)', flexShrink: 0 }} />
              </div>
            </Link>
          )}

          {/* Primary actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ActionCard
              href="/quick-help"
              bg="var(--m3-urgent-bg)" ink="var(--m3-urgent-ink)" btnBg="var(--m3-urgent)"
              label="Immediate need" labelIcon={Zap}
              title="Urgent Booking"
              desc="Find a companion for last-minute emergencies."
              decorIcon={BriefcaseMedical}
            />
            <ActionCard
              href="/booking"
              bg="var(--m3-green)" ink="var(--m3-green-soft)" btnBg="var(--m3-green-deep)"
              label="Plan ahead" labelIcon={Calendar}
              title="Schedule Appointment"
              desc="Book a companion for a future medical visit."
              decorIcon={CalendarDays}
            />
          </div>

          {/* Our services */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          </div>

          {/* Recommended */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionTitle>Recommended for you</SectionTitle>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 21, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>Post-surgery care guide</span>
                  <span style={{ fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>Essential tips for a smooth recovery</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/care-guide.jpg" alt="" style={{ width: 63, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--m3-green-deep)' }}>
                  <BookOpen style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>5 min read</span>
                </span>
                <Link href="/how-it-works" style={{ padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', textDecoration: 'none' }}>Read</Link>
              </div>
            </div>
          </div>

          {/* Trust & safety */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid rgba(192,201,195,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BadgeCheck style={{ width: 22, height: 22, color: 'var(--m3-green)' }} />
              <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>Verified Companions</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: '23px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
              Your safety is our priority. All Caresy companions undergo strict background checks, interviews, and professional certification reviews.
            </p>
            <Link href="/trust" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', color: 'var(--m3-green-deep)', textDecoration: 'none' }}>Learn about our screening</Link>
          </div>

        </div>
      </div>
    </main>
  );
}
