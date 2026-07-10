'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, CheckCircle, Send, MessageCircle } from 'lucide-react';
import { IconButton } from '@/components/ds';

// The 4 core app tabs end at the bottom nav, matching the app design — the
// full website footer only renders on secondary marketing/legal pages.
const APP_TABS = ['/', '/my-bookings', '/support', '/profile'];

export default function Footer() {
  const pathname = usePathname();
  if (APP_TABS.includes(pathname)) return null;

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Caresy home">
            <span className="brand-mark">C</span>
            <span className="brand-text" style={{ color: 'var(--paper)', fontWeight: 'bold' }}>Caresy</span>
          </Link>
          <p className="footer-desc">
            Trusted hospital companions for elderly and vulnerable patients in India. We bridge the gap when families cannot be physically present.
          </p>
          <div className="footer-badges">
            <div className="footer-badge">
              <Shield style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>Police Verified Companions</span>
            </div>
            <div className="footer-badge">
              <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>AuthBridge Secured</span>
            </div>
          </div>
        </div>
        
        <div className="footer-links">
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about">About Us</Link>
            <Link href="/services">Our Services</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/trust">Trust &amp; Safety</Link>
            <Link href="/testimonials">Testimonials</Link>
            <Link href="/companion" style={{ color: 'var(--marigold)', fontWeight: 800 }}>Become a Companion →</Link>
          </div>
          <div className="footer-col">
            <h4>Need Care?</h4>
            <Link href="/quick-help">Same-Day Help</Link>
            <Link href="/booking">Schedule Visit</Link>
            <Link href="/my-bookings">My Bookings</Link>
            <Link href="/support">Support & FAQs</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>

        <div className="footer-newsletter">
          <h4>Stay Connected</h4>
          <p>Get tips and guides on caring for aging family members.</p>
          <form className="footer-form" onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing!'); }}>
            <input type="email" placeholder="Email address" required />
            <IconButton type="submit" ariaLabel="Subscribe" variant="solid" size={38} icon={<Send style={{ width: '16px', height: '16px' }} />} />
          </form>
          <div className="footer-socials">
            <a href="https://wa.me/919717500225" target="_blank" rel="noopener" aria-label="WhatsApp">
              <MessageCircle style={{ width: '16px', height: '16px' }} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect width="4" height="12" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright">&copy; 2026 Caresy Care Services Pvt. Ltd. All rights reserved.</p>
          <div className="footer-bottom-links">
            <span className="footer-address-mini">4th Floor, Sector 7, HSR Layout, Bengaluru, KA 560102</span>
            <span className="footer-divider">|</span>
            <a href="tel:+919717500225">+91 97175 00225</a>
            <span className="footer-divider">|</span>
            <a href="mailto:support@caresy.co">support@caresy.co</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
