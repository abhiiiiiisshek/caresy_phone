'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Phone, Menu, X, Home, HeartHandshake, Calendar, User, Info, Building2, HelpCircle, Settings, LogOut, ShieldCheck } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, openLogin, signOut } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Sync isNavOpen state to body class (compatible with existing styles)
  useEffect(() => {
    if (isNavOpen) {
      document.body.classList.add('nav-open');
    } else {
      document.body.classList.remove('nav-open');
    }
    return () => {
      document.body.classList.remove('nav-open');
    };
  }, [isNavOpen]);

  // Close nav on pathname change
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const closeNav = () => setIsNavOpen(false);

  const handleLogout = async () => {
    await signOut();
    closeNav();
    router.push('/');
  };

  const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
  const isServices = pathname === '/services';
  const isQuickHelp = pathname === '/quick-help';
  const isBooking = pathname === '/booking';
  const isTrack = pathname === '/my-bookings';

  // Get initials for profile badge
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'C';

  return (
    <header className="app-bar">
      {isHome ? (
        <button className="nav-toggle" type="button" aria-label="Open menu" aria-expanded={isNavOpen} onClick={toggleNav}>
          <span></span>
          <span></span>
        </button>
      ) : (
        <button onClick={() => router.back()} className="nav-back" aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft style={{ width: '20px', height: '20px', color: 'var(--paper)' }} />
        </button>
      )}

      <Link href="/" className="brand" aria-label="Caresy home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '1rem', marginRight: '10px' }}>C</div>
        <span className="brand-text" style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--ink-teal)' }}>Caresy</span>
      </Link>

      <a href="tel:+919717500225" className="header-call-btn" aria-label="Call Caresy">
        <Phone style={{ width: '20px', height: '20px' }} />
      </a>

      <nav className={`main-nav ${isNavOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <button className="menu-close-btn" type="button" aria-label="Close menu" onClick={closeNav}>
          <X style={{ width: '24px', height: '24px' }} />
        </button>
        <div className="menu-header">
          <div className="brand-mark-gold">C</div>
          <div>
            <strong className="menu-brand-name">caresy</strong>
            <span className="menu-brand-tagline">Your Care, Our Priority.</span>
          </div>
        </div>

        {/* Quick-action CTAs: on wide screens these live in .header-actions already,
            so they're hidden here by default and only shown inside the mobile
            drawer (see .mobile-quick-actions rule in globals.css). */}
        <div className="mobile-quick-actions" style={{ display: 'none', gap: '8px', marginBottom: '14px' }}>
          <Link href="/quick-help" className="btn nav-quick" style={{ flex: 1, justifyContent: 'center', fontSize: '0.86rem' }}>Need help today</Link>
          <Link href="/booking" className="btn nav-cta" style={{ flex: 1, justifyContent: 'center', fontSize: '0.86rem' }}>Book for later</Link>
        </div>

        <Link className={isHome ? 'active' : ''} href="/"><Home style={{ width: '18px', height: '18px' }} /> Home</Link>
        <Link className={isServices ? 'active' : ''} href="/services"><HeartHandshake style={{ width: '18px', height: '18px' }} /> Services</Link>

        {user ? (
          <>
            <Link className={isTrack ? 'active' : ''} href="/my-bookings"><Calendar style={{ width: '18px', height: '18px' }} /> Bookings</Link>
            <Link href="/my-bookings#profile"><User style={{ width: '18px', height: '18px' }} /> Profile</Link>
          </>
        ) : (
          <button
            onClick={() => { closeNav(); openLogin(); }}
            className="nav-auth-link"
            style={{ background: 'none', border: 'none', padding: '10px 14px', borderRadius: '999px', color: 'rgba(245, 244, 238, 0.85)', fontSize: '0.92rem', fontWeight: 760, alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <User style={{ width: '18px', height: '18px' }} /> Log In / Sign Up
          </button>
        )}

        <Link className={pathname === '/trust' ? 'active' : ''} href="/trust"><ShieldCheck style={{ width: '18px', height: '18px' }} /> Trust &amp; Safety</Link>
        <Link className={pathname === '/about' ? 'active' : ''} href="/about"><Info style={{ width: '18px', height: '18px' }} /> About Us</Link>
        <Link className={pathname === '/for-hospitals' ? 'active' : ''} href="/for-hospitals"><Building2 style={{ width: '18px', height: '18px' }} /> For Hospitals</Link>
        <Link className={pathname === '/faq' ? 'active' : ''} href="/faq"><HelpCircle style={{ width: '18px', height: '18px' }} /> FAQs</Link>
        <Link className={pathname === '/contact' ? 'active' : ''} href="/contact"><Phone style={{ width: '18px', height: '18px' }} /> Contact Us</Link>
        
        {isAdmin && (
          <Link className={pathname === '/admin-ops' ? 'active' : ''} href="/admin-ops" style={{ color: 'var(--marigold)' }}><Settings style={{ width: '18px', height: '18px' }} /> Admin Operations</Link>
        )}

        {user && (
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', padding: '10px 14px', borderRadius: '999px', color: 'var(--vermilion)', fontSize: '0.92rem', fontWeight: 760, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: '10px' }}>
            <LogOut style={{ width: '18px', height: '18px' }} /> Logout
          </button>
        )}
      </nav>

      {/* Desktop Quick Header Actions Bar */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-teal)', marginRight: '24px' }} className="hidden md:flex">
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
          <Link href="/trust">Trust</Link>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link className="btn" href="/quick-help" style={{ background: '#FCEAE8', color: 'var(--terracotta)', fontSize: '0.84rem', padding: '8px 16px', borderRadius: '999px', fontWeight: 800, textDecoration: 'none' }}>
            Need help today
          </Link>
          <Link className="btn" href="/booking" style={{ background: 'var(--teal)', color: '#fff', fontSize: '0.84rem', padding: '8px 16px', borderRadius: '999px', fontWeight: 800, textDecoration: 'none' }}>
            Book for later
          </Link>
        </div>

        {user ? (
          <div className="user-menu-container" style={{ position: 'relative', marginLeft: '6px' }}>
            <Link href="/my-bookings#profile" className="brand-mark-gold" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--marigold)', color: 'var(--ink-teal)', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none' }}>
              {initials}
            </Link>
          </div>
        ) : (
          <button className="btn nav-auth" onClick={() => openLogin()} style={{ minHeight: 'auto', padding: '6px 12px', fontSize: '0.84rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--paper)', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer', marginLeft: '6px' }}>
            Login / Signup
          </button>
        )}
      </div>
    </header>
  );
}
