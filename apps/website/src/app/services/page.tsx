'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, IndianRupee, ShieldCheck, Car } from 'lucide-react';

// Each service is a full-bleed frame with the photo faded into the card colour
// — the same treatment as the Urgent/Schedule banners on the home page, which
// is the look the rest of the app is converging on.
//
// No per-service price tags: pricing is by time, not by tier, so the sheet
// lives once in the strip below and every card links to the same meter.
const SERVICES = [
  {
    title: 'Hospital Companion',
    desc: 'A verified companion through queues, consultations, paperwork and pharmacy — so nobody waits alone.',
    img: '/assets/caresy-hospital-support.webp',
    imgAlt: 'Caresy companion assisting a patient in a wheelchair',
    bg: 'var(--m3-green)',
    ink: 'var(--m3-green-soft)',
  },
  {
    title: 'Elderly Care',
    desc: 'Patient, unhurried support for older parents — including when family can only be there by phone.',
    img: '/assets/caresy-companion-priya.webp',
    imgAlt: 'A Caresy companion with an elderly patient',
    bg: 'var(--m3-urgent-bg)',
    ink: 'var(--m3-urgent-ink)',
  },
  {
    title: 'Pickup & Drive',
    desc: 'Your companion drives the patient in your own car or bike — no cab fares, no strangers behind the wheel.',
    img: '/assets/caresy-companion-anil.webp',
    imgAlt: 'A Caresy companion ready to drive',
    bg: 'var(--m3-green)',
    ink: 'var(--m3-green-soft)',
  },
  {
    title: 'Full Day Support',
    desc: 'Day-care admissions, long procedures, multiple appointments — one companion for the whole day.',
    img: '/assets/caresy-family-app.webp',
    imgAlt: 'Care timeline on a phone in a hospital corridor',
    bg: 'var(--m3-urgent-bg)',
    ink: 'var(--m3-urgent-ink)',
  },
];

const PRICE_POINTS = [
  { icon: IndianRupee, title: '₹299 first hour', sub: 'then just ₹4 a minute' },
  { icon: Clock, title: 'Full day ₹1,599', sub: 'whichever is less — always' },
  { icon: ShieldCheck, title: '15 min grace', sub: 'appointments run late; we don’t bill for it' },
  { icon: Car, title: 'Pay after the visit', sub: 'cash or UPI · evening 6–8pm +₹99' },
];

export default function Services() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Complete hospital support</p>
        <h1>Our Services</h1>
        <p style={{ margin: '0 auto' }}>One companion, one simple price by time — every service below is on the same meter.</p>
      </section>

      <section className="section" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* The price sheet, said once. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {PRICE_POINTS.map((p) => (
            <div key={p.title} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 14px', borderRadius: 16, background: 'var(--m3-chip)', textAlign: 'center', alignItems: 'center' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: '#fff', color: 'var(--m3-green)', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
                <p.icon style={{ width: 18, height: 18 }} />
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--m3-ink)' }}>{p.title}</span>
              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--m3-muted)' }}>{p.sub}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SERVICES.map((s) => (
            <Link key={s.title} href="/booking" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 148, padding: 22, borderRadius: 'var(--m3-radius-card, 20px)', background: s.bg, overflow: 'hidden', textDecoration: 'none' }}>
              {/* Photo bleeds off the right edge, faded into the card colour so the copy stays legible. */}
              <span aria-hidden role="img" aria-label={s.imgAlt} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '62%', backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${s.bg} 0%, ${s.bg} 38%, transparent 86%)` }} />
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 230 }}>
                <span style={{ fontSize: 21, lineHeight: '26px', fontWeight: 700, color: s.ink }}>{s.title}</span>
                <span style={{ fontSize: 13.5, lineHeight: '19px', letterSpacing: '0.2px', color: s.ink, opacity: 0.92 }}>{s.desc}</span>
              </span>
              <span style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', color: 'var(--m3-green-deep)', flexShrink: 0 }}>
                <ArrowRight style={{ width: 16, height: 16 }} />
              </span>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/booking" className="btn btn-primary">Book a Companion</Link>
          <p style={{ margin: '12px auto 0', maxWidth: 420, fontSize: 12.5, color: 'var(--m3-muted)' }}>
            Free cancellation until 6 hours before a scheduled visit, or within 30 minutes of an urgent one. After that, ₹99 — it goes to the companion who set out for you.
          </p>
        </div>
      </section>
    </main>
  );
}
