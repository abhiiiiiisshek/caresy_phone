'use client';

import React from 'react';
import { PhoneCall } from 'lucide-react';
import { Card } from '@/components/ds';

const STEPS = [
  { title: 'Book Your Service', desc: 'Choose the service you need and share the details with us.' },
  { title: 'We Confirm', desc: 'Our team will confirm your booking and prepare for your assistance.' },
  { title: 'We Assist You', desc: 'Our executive will reach on time and assist you with everything you need.' },
  { title: 'You Focus on Recovery', desc: 'We take care of the rest so you can focus on what truly matters.' },
];

export default function HowItWorks() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>How it works</p>
        <h1>Getting help is simple.</h1>
        <p style={{ margin: '0 auto' }}>No app download, no account required to get started — just a call or a form.</p>
      </section>

      {/* Vertical Timeline */}
      <section className="section" style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '12px', bottom: '12px', left: '41px', borderLeft: '2px dashed var(--teal)', zIndex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative', zIndex: 2 }}>
          {STEPS.map((step, i) => (
            <div key={step.title} style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0, border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--teal)' }}>
                {i + 1}
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>{step.title}</h2>
                <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Support Call Box */}
      <section className="section" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Card variant="sunken" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--sage)', borderColor: 'var(--sage-deep)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--teal-deep)', color: '#fff', marginBottom: '12px' }}>
            <PhoneCall style={{ width: '20px', height: '20px' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>Need help booking?</h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '300px' }}>
            Call us directly and our operations desk will assist you in scheduling.
          </p>
          <a href="tel:+919717500225" style={{ fontSize: '1.2rem', fontWeight: 750, color: 'var(--ink-teal)', textDecoration: 'none', borderBottom: '2px solid var(--teal)' }}>
            +91 97175 00225
          </a>
        </Card>
      </section>
    </main>
  );
}
