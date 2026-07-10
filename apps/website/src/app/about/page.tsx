'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '@/components/ds';

const CHECKLIST = ['Trained & Verified Executives', 'On-time & Reliable Support', 'Compassionate Care', 'Your Privacy, Our Priority'];

const FOUNDERS = [
  {
    photo: '/assets/caresy-founder-rohan.png',
    quote: "My mother sat through a full day of scans and queues alone while I was stuck on a flight I couldn't change. Nobody should have to choose between being at work and being there for their family.",
    name: 'Rohan Mehta',
    role: 'Co-founder & CEO',
  },
  {
    photo: '/assets/caresy-founder-meera.png',
    quote: 'We built the verification pipeline first, before a single booking feature — because trust has to be earned before it\'s asked for. Every companion is Aadhaar- and police-verified before they ever meet a family.',
    name: 'Meera Nair',
    role: 'Co-founder & Head of Trust & Safety',
  },
];

export default function About() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>About Caresy</p>
        <h1>No one should feel alone during a hospital visit.</h1>
        <p style={{ margin: '0 auto' }}>Caresy was born out of a simple belief — that a family member deserves someone by their side, even when you can&apos;t be there yourself.</p>
      </section>

      <section className="section" style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
        <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: 'var(--sage)', aspectRatio: '1.3', border: '1px solid var(--line)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/caresy-hospital-support.png" alt="Caresy companion and elderly patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div>
          <p style={{ fontSize: '1.02rem', color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 24px' }}>
            We understand how challenging hospital visits can be. That&apos;s why we are here — to take care of the little things, so you can focus on what truly matters.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CHECKLIST.map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 style={{ color: 'var(--teal)', width: 20, height: 20, flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Card style={{ textAlign: 'center' }}>
          <Badge tone="teal" style={{ marginBottom: 8 }}>Our Mission</Badge>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5, margin: '8px auto 0', maxWidth: '420px' }}>
            To provide reliable, compassionate and trustworthy assistance to patients and their families.
          </p>
        </Card>
      </section>

      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="section-title" style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2>Why we started Caresy.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FOUNDERS.map((f) => (
            <Card key={f.name} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.photo} alt={f.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.55, margin: '0 0 8px' }}>&ldquo;{f.quote}&rdquo;</p>
                <strong style={{ fontSize: '0.86rem', color: 'var(--ink-teal)' }}>{f.name}</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>{f.role}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
