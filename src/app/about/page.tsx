'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function About() {
  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="about-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          About Caresy
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          Caresy was born out of a simple belief - no one should feel alone during a hospital visit.
        </p>
      </section>

      {/* Patient Illustration Section */}
      <section className="about-image-section" style={{ padding: '0 16px 24px' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: 'var(--sage)', aspectRatio: '1.6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
          <img src="/assets/caresy-hospital-support.png" alt="Caresy companion and elderly patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </section>

      {/* Core Text Section */}
      <section className="about-content-section" style={{ padding: '0 20px 24px' }}>
        <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: 1.6, margin: '0 0 24px' }}>
          We understand how challenging hospital visits can be. That's why we are here - to take care of the little things, so you can focus on what truly matters.
        </p>
        
        {/* Checklist */}
        <div className="about-checklist" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ color: 'var(--marigold)', width: '20px', height: '20px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)' }}>Trained & Verified Executives</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ color: 'var(--marigold)', width: '20px', height: '20px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)' }}>On-time & Reliable Support</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ color: 'var(--marigold)', width: '20px', height: '20px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)' }}>Compassionate Care</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ color: 'var(--marigold)', width: '20px', height: '20px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)' }}>Your Privacy, Our Priority</span>
          </div>

        </div>
      </section>

      {/* Mission Card Section */}
      <section className="about-mission-section" style={{ padding: '0 16px 40px' }}>
        <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center', boxShadow: 'var(--shadow-1)' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--marigold-deep)', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Our Mission</span>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--charcoal)', lineHeight: 1.5, margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            To provide reliable, compassionate and trustworthy assistance to patients and their families.
          </p>
        </div>
      </section>

    </main>
  );
}
