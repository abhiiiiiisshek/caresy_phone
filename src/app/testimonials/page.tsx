'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

export default function Testimonials() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="testimonials-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25, textAlign: 'center' }}>
          What People Say
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          Real stories from people who experienced Caresy.
        </p>
      </section>

      {/* Testimonials List Section */}
      <section className="testimonials-list-section" style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Testimonial 1 */}
        <div className="testimonial-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', color: 'var(--marigold)' }}>
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: '1.6', fontStyle: 'italic', margin: '0 0 16px', position: 'relative', zIndex: 2 }}>
            "Caresy made our hospital visit so much easier. The executive helped us with everything patiently."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '0.88rem' }}>
              NS
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--charcoal)', display: 'block' }}>Neha Sharma</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted-teal-gray)' }}>New Delhi</span>
            </div>
          </div>
        </div>

        {/* Testimonial 2 */}
        <div className="testimonial-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', color: 'var(--marigold)' }}>
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: '1.6', fontStyle: 'italic', margin: '0 0 16px', position: 'relative', zIndex: 2 }}>
            "Very professional and reliable service. Highly recommend to anyone in need."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '0.88rem' }}>
              RV
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--charcoal)', display: 'block' }}>Ramesh Verma</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted-teal-gray)' }}>Ghaziabad</span>
            </div>
          </div>
        </div>

        {/* Testimonial 3 */}
        <div className="testimonial-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', color: 'var(--marigold)' }}>
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
            <Star style={{ width: '16px', height: '16px', fill: 'var(--marigold)' }} />
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: '1.6', fontStyle: 'italic', margin: '0 0 16px', position: 'relative', zIndex: 2 }}>
            "The elderly care companion was very kind and supportive with my mother."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '0.88rem' }}>
              AM
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--charcoal)', display: 'block' }}>Anjali Mehta</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted-teal-gray)' }}>Noida</span>
            </div>
          </div>
        </div>

      </section>

      {/* Bottom Action Button Section */}
      <section className="testimonials-action-section" style={{ padding: '0 16px 40px', textAlign: 'center' }}>
        <Link href="/booking" className="btn btn-primary" style={{ width: '100%', maxWidth: '320px', fontSize: '1.05rem', padding: '16px', display: 'inline-flex' }}>
          Book Your Assistance
        </Link>
      </section>

    </main>
  );
}
