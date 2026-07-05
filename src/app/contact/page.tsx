'use client';

import React from 'react';
import { Phone, MessageSquare, Mail, Clock, MapPin } from 'lucide-react';

export default function Contact() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Message sent successfully!');
    e.currentTarget.reset();
  };

  return (
    <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Title Section */}
      <section className="contact-header-section" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '12px', lineHeight: 1.25 }}>
          Contact Us
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--muted-teal-gray)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          We're here to help you anytime you need.
        </p>
      </section>

      {/* Contact Info Cards */}
      <section className="contact-info-section" style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Call */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Phone style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--muted-teal-gray)', display: 'block' }}>Call Us</span>
            <a href="tel:+919717500225" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--charcoal)', textDecoration: 'none' }}>+91 97175 00225</a>
          </div>
        </div>

        {/* WhatsApp */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <MessageSquare style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--muted-teal-gray)', display: 'block' }}>WhatsApp</span>
            <a href="https://wa.me/919717500225" target="_blank" rel="noopener" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--charcoal)', textDecoration: 'none' }}>+91 97175 00225</a>
          </div>
        </div>

        {/* Email */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Mail style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--muted-teal-gray)', display: 'block' }}>Email Us</span>
            <a href="mailto:support@caresy.co" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--charcoal)', textDecoration: 'none' }}>support@caresy.co</a>
          </div>
        </div>

        {/* Working Hours */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <Clock style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--muted-teal-gray)', display: 'block' }}>Working Hours</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--charcoal)' }}>Mon - Sun, 6:00 AM - 10:00 PM</span>
          </div>
        </div>

        {/* Office Address */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink-teal)', flexShrink: 0 }}>
            <MapPin style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: 'var(--muted-teal-gray)', display: 'block' }}>Our Office</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--charcoal)', lineHeight: '1.45', display: 'block' }}>
              Caresy Healthcare Services Pvt. Ltd., 4th Floor, Sector 7, HSR Layout, Bengaluru, KA 560102
            </span>
          </div>
        </div>

      </section>

      {/* Message Form Section */}
      <section className="contact-form-section" style={{ padding: '24px 16px', background: 'var(--surface)', borderRadius: '12px', margin: '0 16px 40px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '20px', textAlign: 'center' }}>Drop us a message</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label htmlFor="contact-name" style={{ marginBottom: '6px', display: 'block', fontSize: '0.84rem', fontWeight: '700', color: 'var(--charcoal)' }}>Name</label>
            <input type="text" id="contact-name" placeholder="Your Full Name" required style={{ borderRadius: '8px', padding: '12px 14px', fontSize: '0.9rem', width: '100%', border: '1px solid var(--line)', background: 'var(--surface)' }} />
          </div>

          <div>
            <label htmlFor="contact-phone" style={{ marginBottom: '6px', display: 'block', fontSize: '0.84rem', fontWeight: '700', color: 'var(--charcoal)' }}>Phone Number</label>
            <input type="tel" id="contact-phone" placeholder="Your Phone Number" required style={{ borderRadius: '8px', padding: '12px 14px', fontSize: '0.9rem', width: '100%', border: '1px solid var(--line)', background: 'var(--surface)' }} />
          </div>

          <div>
            <label htmlFor="contact-message" style={{ marginBottom: '6px', display: 'block', fontSize: '0.84rem', fontWeight: '700', color: 'var(--charcoal)' }}>Your Message</label>
            <textarea id="contact-message" placeholder="How can we help you?" rows={4} required style={{ borderRadius: '8px', padding: '12px 14px', fontSize: '0.9rem', width: '100%', border: '1px solid var(--line)', background: 'var(--surface)', resize: 'vertical' }}></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            Send Message
          </button>

        </form>
      </section>

    </main>
  );
}
