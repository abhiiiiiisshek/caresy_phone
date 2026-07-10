'use client';

import React from 'react';
import Link from 'next/link';
import { Smile, Activity, ShieldCheck, Expand } from 'lucide-react';
import { Card } from '@/components/ds';

const BENEFITS = [
  { icon: Smile, title: 'Enhanced Patient Experience', desc: 'Provide a seamless and stress-free experience for patients and their attendants.' },
  { icon: Activity, title: 'Operational Efficiency', desc: 'We handle non-medical tasks so your staff can focus on what matters most.' },
  { icon: ShieldCheck, title: 'Trusted & Professional', desc: 'Our trained executives represent your hospital with care and professionalism.' },
  { icon: Expand, title: 'Scalable Support', desc: 'Flexible solutions designed to match the needs of hospitals of all sizes.' },
];

export default function ForHospitals() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>For Hospitals</p>
        <h1>Partner with Caresy.</h1>
        <p style={{ margin: '0 auto' }}>Enhance patient experience and operational efficiency with a trusted companion network.</p>
      </section>

      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: 'var(--sage)', aspectRatio: '2.2', border: '1px solid var(--line)', marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/caresy-hero.png" alt="Hospital support illustration" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {BENEFITS.map((b) => (
            <div key={b.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 18, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
                <b.icon style={{ width: 18, height: 18 }} />
              </span>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>{b.title}</div>
                <div style={{ fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.45, marginTop: 4 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <Card>
          <p style={{ fontSize: '1.02rem', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Partner with us today. Let&apos;s work together to make a difference.
          </p>
          <Link href="/support" className="btn btn-primary">Connect With Us</Link>
        </Card>
      </section>
    </main>
  );
}
