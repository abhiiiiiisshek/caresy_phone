'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Car, User, Shield, Star } from 'lucide-react';

export default function Home() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Hero Section */}
      <section className="hero-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          Your Care,<br />
          <span style={{ color: 'var(--marigold)' }}>Our Priority.</span>
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '12px auto' }}>
          We assist you and your loved ones with everything you need at the hospital so you can focus on what matters most.
        </p>
        <Link href="/booking" className="btn btn-primary" style={{ width: '100%', maxWidth: '320px', fontSize: '1.05rem', padding: '14px', marginBottom: '12px', display: 'inline-flex' }}>
          Book Assistance
        </Link>
        <div style={{ fontSize: '0.88rem', color: 'var(--marigold-deep)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '10px' }}>
          <span style={{ color: 'var(--marigold)' }}>♥</span> Available at 50+ Hospitals
        </div>
      </section>

      {/* Patient Companion Illustration Image */}
      <section className="hero-image-section" style={{ padding: '0 16px 30px' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: 'var(--sage)', aspectRatio: '1.5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
          <img 
            src="/assets/caresy-hero.png" 
            alt="Caresy companion helping an elderly patient in a hospital lobby" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </section>

      {/* Our Services Section */}
      <section className="services-section" style={{ padding: '24px 16px', background: 'var(--surface)', borderRadius: '12px', margin: '0 16px 40px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '20px', textAlign: 'center', letterSpacing: '-0.01em' }}>Our Services</h2>
        
        <div className="services-grid" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Service Card 1 */}
          <div className="service-card" style={{ display: 'flex', gap: '14px', alignItems: 'start', padding: '14px', borderRadius: '12px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
              <FileText style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Hospital Assistance</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
                We help with paperwork, appointments, medicine pickup, queue management and waiting room comfort.
              </p>
            </div>
          </div>

          {/* Service Card 2 */}
          <div className="service-card" style={{ display: 'flex', gap: '14px', alignItems: 'start', padding: '14px', borderRadius: '12px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
              <Car style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Pick-up & Drop</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
                Safe and reliable pickup and drop services for patients and their attendants.
              </p>
            </div>
          </div>

          {/* Service Card 3 */}
          <div className="service-card" style={{ display: 'flex', gap: '14px', alignItems: 'start', padding: '14px', borderRadius: '12px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
              <User style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Elderly Care Companion</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
                Compassionate companionship and assistance for elderly during hospital visits.
              </p>
            </div>
          </div>

          {/* Service Card 4 */}
          <div className="service-card" style={{ display: 'flex', gap: '14px', alignItems: 'start', padding: '14px', borderRadius: '12px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', flexShrink: 0 }}>
              <Shield style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 4px' }}>Full-day Concierge</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-teal-gray)', lineHeight: 1.45, margin: 0 }}>
                Complete day-long support so you don't have to worry about a thing.
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
