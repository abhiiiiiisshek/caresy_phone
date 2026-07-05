'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Car, User, Shield } from 'lucide-react';

export default function Services() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="services-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          Our Services
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          Comprehensive support designed to make hospital visits stress-free.
        </p>
      </section>

      {/* Services List Section */}
      <section className="services-list-section" style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Card 1 */}
        <div className="service-card" style={{ display: 'flex', gap: '16px', alignItems: 'start', padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <FileText style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>Hospital Assistance</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
              We help with paperwork, appointments, medicine pickup, queue management and waiting room comfort.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="service-card" style={{ display: 'flex', gap: '16px', alignItems: 'start', padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Car style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>Pick-up & Drop</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
              Safe and reliable pickup and drop services for patients and their attendants.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="service-card" style={{ display: 'flex', gap: '16px', alignItems: 'start', padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <User style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>Elderly Care Companion</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
              Compassionate companionship and assistance for elderly during hospital visits.
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="service-card" style={{ display: 'flex', gap: '16px', alignItems: 'start', padding: '20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Shield style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 6px' }}>Full-day Concierge</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted-teal-gray)', lineHeight: 1.5, margin: 0 }}>
              Complete day-long support so you don't have to worry about a thing.
            </p>
          </div>
        </div>

      </section>

      {/* Bottom CTA Button Section */}
      <section className="services-action-section" style={{ padding: '0 16px 40px', textAlign: 'center' }}>
        <Link href="/booking" className="btn btn-primary" style={{ width: '100%', maxWidth: '320px', fontSize: '1.05rem', padding: '16px', display: 'inline-flex' }}>
          Book a Service
        </Link>
      </section>

    </main>
  );
}
