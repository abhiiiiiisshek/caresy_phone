'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import {
  PhoneCall, Zap, Calendar, Stethoscope, Pill, FlaskConical, Home as HomeIcon,
  ShieldCheck, Building2, Headset,
} from 'lucide-react';
import { CompanionCard } from '@/components/ds';
import LocationBadge from '@/components/LocationBadge';
import { COMPANIONS } from '@/data/companions';

const SUPPORT_TEL = '+919717500225';

const APP_SERVICES = [
  { icon: Stethoscope, title: 'Hospital Companion', price: '₹499' },
  { icon: Pill, title: 'Medicine Pickup', price: '₹299' },
  { icon: FlaskConical, title: 'Diagnostic Test', price: '₹899' },
  { icon: HomeIcon, title: 'Safe Return', price: '₹899' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: '100% Police Verified', desc: 'Aadhaar + background checks via AuthBridge' },
  { icon: Building2, title: '50+ Partner Hospitals', desc: 'Across Noida & Greater Noida' },
  { icon: Headset, title: '24/7 Ops Control Room', desc: 'Real humans, always reachable' },
];

interface ActiveBookingInfo {
  reference_code: string;
  status: string;
  pickup_location?: { title?: string } | null;
  service_metadata?: { companion?: { name?: string; photo?: string } };
}

function SectionHead({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 4px 8px' }}>
      <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{title}</h3>
      {action && actionHref && (
        <Link href={actionHref} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal)', textDecoration: 'none' }}>{action}</Link>
      )}
    </div>
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
  const companion = activeBooking?.service_metadata?.companion;

  return (
    <main className="app-shell-page" id="main-content" style={{ background: 'var(--paper)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Greeting bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 2px 8px' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--ink-teal)' }}>
              {firstName ? `Hello, ${firstName}` : 'Hello there'}
            </div>
            <LocationBadge />
          </div>
          <a href={`tel:${SUPPORT_TEL}`} aria-label="Call Caresy" style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--terracotta)', color: '#fff', flexShrink: 0 }}>
            <PhoneCall style={{ width: 20, height: 20 }} />
          </a>
        </div>

        {/* Active booking banner — only rendered when a real assigned/in-progress booking exists */}
        {activeBooking && (
          <Link href="/my-bookings" style={{ textDecoration: 'none' }}>
            <div role="status" style={{ margin: '4px 0 8px', padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--sage-deep)', boxShadow: 'var(--shadow-1)', display: 'flex', gap: 12, alignItems: 'center' }}>
              {companion?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={companion.photo} alt={`Companion ${companion.name}`} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>
                  {(companion?.name || 'C').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                  <strong style={{ fontSize: '0.9rem', color: 'var(--ink-teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {companion?.name ? `${companion.name} is on the way` : 'Companion assigned'}
                    {activeBooking.pickup_location?.title ? ` · ${activeBooking.pickup_location.title}` : ''}
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>Booking {activeBooking.reference_code}</div>
              </div>
            </div>
          </Link>
        )}

        {/* Intent grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
          <Link href="/quick-help" style={{ textAlign: 'left', minHeight: 148, padding: 18, borderRadius: 'var(--radius-xl)', textDecoration: 'none', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(145deg, rgba(255,255,255,0.15), transparent 42%), var(--terracotta)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)' }}><Zap style={{ width: 20, height: 20 }} /></span>
            <span><strong style={{ display: 'block', fontSize: '1.05rem' }}>Emergency Now</strong><small style={{ opacity: 0.9, fontSize: '0.76rem' }}>Attendant reaches in 20–30 mins</small></span>
          </Link>
          <Link href="/booking" style={{ textAlign: 'left', minHeight: 148, padding: 18, borderRadius: 'var(--radius-xl)', textDecoration: 'none', color: 'var(--ink-teal)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(145deg, rgba(255,255,255,0.5), transparent 42%), var(--sage)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'rgba(22,48,43,0.1)' }}><Calendar style={{ width: 20, height: 20 }} /></span>
            <span><strong style={{ display: 'block', fontSize: '1.05rem' }}>Schedule Visit</strong><small style={{ color: 'rgba(22,48,43,0.7)', fontSize: '0.76rem' }}>Book for an appointment or test</small></span>
          </Link>
        </div>

        {/* Quick services */}
        <SectionHead title="Quick services" action="See all" actionHref="/services" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {APP_SERVICES.map((s) => (
            <Link key={s.title} href="/booking" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)', textDecoration: 'none' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--teal-soft)', color: 'var(--teal)', flexShrink: 0 }}><s.icon style={{ width: 18, height: 18 }} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{s.title}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>from {s.price}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Verified companions */}
        <SectionHead title="Verified companions" action="Meet the team" actionHref="/trust" />
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
          {COMPANIONS.map((c) => (
            <div key={c.id} style={{ scrollSnapAlign: 'center', flexShrink: 0 }}>
              <CompanionCard
                name={c.name}
                photo={c.photo}
                initials={c.avatarInitials}
                rating={c.rating}
                visits={c.visits}
                verification={c.verification}
                languages={c.languages}
                specialty={c.specialty}
                style={{ width: 230 }}
              />
            </div>
          ))}
        </div>

        {/* Why families trust Caresy */}
        <SectionHead title="Why families trust Caresy" />
        <div style={{ display: 'grid', gap: 10, padding: '0 0 32px' }}>
          {TRUST_ITEMS.map((t) => (
            <div key={t.title} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'var(--success-soft)', color: '#1B7A54', flexShrink: 0 }}><t.icon style={{ width: 18, height: 18 }} /></span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{t.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
