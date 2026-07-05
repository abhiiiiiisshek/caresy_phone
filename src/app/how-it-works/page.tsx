'use client';

import React from 'react';
import { PhoneCall } from 'lucide-react';

export default function HowItWorks() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="how-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          How it Works
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '30px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          Getting help with Caresy is simple and hassle-free.
        </p>
      </section>

      {/* Vertical Timeline Section */}
      <section className="timeline-section" style={{ padding: '0 24px 40px', position: 'relative' }}>
        
        {/* Vertical Dashed Line */}
        <div style={{ position: 'absolute', top: '12px', bottom: '12px', left: '40px', borderLeft: '2px dashed var(--marigold)', zIndex: 1 }}></div>
        
        {/* Steps Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative', zIndex: 2 }}>
          
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '1rem', flexShrink: 0, border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--marigold)' }}>
              1
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>Book Your Service</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
                Choose the service you need and share the details with us.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '1rem', flexShrink: 0, border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--marigold)' }}>
              2
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>We Confirm</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
                Our team will confirm your booking and prepare for your assistance.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '1rem', flexShrink: 0, border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--marigold)' }}>
              3
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>We Assist You</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
                Our executive will reach on time and assist you with everything you need.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', fontWeight: '700', fontSize: '1rem', flexShrink: 0, border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--marigold)' }}>
              4
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>You Focus on Recovery</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
                We take care of the rest so you can focus on what truly matters.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Support Call Box Section */}
      <section className="how-support-section" style={{ padding: '0 16px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', borderRadius: '12px', background: 'var(--sage)', border: '1px solid var(--sage-deep)', textAlign: 'center', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--marigold-deep)', color: 'var(--paper)', marginBottom: '12px' }}>
            <PhoneCall style={{ width: '20px', height: '20px' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 8px' }}>Need help booking?</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '300px' }}>
            Call us directly and our operations desk will assist you in scheduling.
          </p>
          <a href="tel:+919717500225" style={{ fontSize: '1.2rem', fontWeight: 750, color: 'var(--ink-teal)', textDecoration: 'none', borderBottom: '2px solid var(--marigold)' }}>
            +91 97175 00225
          </a>
        </div>
      </section>

    </main>
  );
}
