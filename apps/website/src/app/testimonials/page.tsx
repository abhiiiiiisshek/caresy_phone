'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card } from '@/components/ds';

const TESTIMONIALS = [
  { quote: 'Caresy made our hospital visit so much easier. The executive helped us with everything patiently.', initials: 'NS', name: 'Neha Sharma', place: 'New Delhi' },
  { quote: 'Very professional and reliable service. Highly recommend to anyone in need.', initials: 'RV', name: 'Ramesh Verma', place: 'Ghaziabad' },
  { quote: 'The elderly care companion was very kind and supportive with my mother.', initials: 'AM', name: 'Anjali Mehta', place: 'Noida' },
];

export default function Testimonials() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Family trust</p>
        <h1>What People Say</h1>
        <p style={{ margin: '0 auto' }}>Real stories from people who experienced Caresy.</p>
      </section>

      <section className="section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t) => (
            <Card key={t.initials}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, color: 'var(--warning)' }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} style={{ width: 16, height: 16, fill: 'var(--warning)' }} />)}
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 16px' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0 }}>
                  {t.initials}
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--ink)', display: 'block' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{t.place}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/booking" className="btn btn-primary">Book Your Assistance</Link>
        </div>
      </section>
    </main>
  );
}
