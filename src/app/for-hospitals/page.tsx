'use client';

import React from 'react';
import Link from 'next/link';
import { Smile, Activity, ShieldCheck, Expand } from 'lucide-react';

export default function ForHospitals() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="hospitals-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          For Hospitals
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          Partner with Caresy to enhance patient experience and operational efficiency.
        </p>
      </section>

      {/* Illustration Section */}
      <section className="hospitals-image-section" style={{ padding: '0 16px 24px' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: 'var(--sage)', aspectRatio: '1.6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
          <img src="/assets/caresy-hero.png" alt="Hospital support illustration" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </section>

      {/* Benefits Checklist Section */}
      <section className="hospitals-benefits-section" style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Benefit 1 */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Smile style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Enhanced Patient Experience</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
              Provide a seamless and stress-free experience for patients and their attendants.
            </p>
          </div>
        </div>

        {/* Benefit 2 */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Activity style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Operational Efficiency</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
              We handle non-medical tasks so your staff can focus on what matters most.
            </p>
          </div>
        </div>

        {/* Benefit 3 */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <ShieldCheck style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Trusted & Professional</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
              Our trained executives represent your hospital with care and professionalism.
            </p>
          </div>
        </div>

        {/* Benefit 4 */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Expand style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Scalable Support</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
              Flexible solutions designed to match the needs of hospitals of all sizes.
            </p>
          </div>
        </div>

      </section>

      {/* Connect Box Section */}
      <section className="hospitals-connect-section" style={{ padding: '0 16px 40px', textAlign: 'center' }}>
        <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: 1.5, margin: '0 0 16px' }}>
            Partner with us today. Let's work together to make a difference.
          </p>
          <Link href="/contact" className="btn btn-primary" style={{ width: '100%', maxWidth: '280px', fontSize: '1.05rem', display: 'inline-flex' }}>
            Connect With Us
          </Link>
        </div>
      </section>

    </main>
  );
}
