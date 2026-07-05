'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Phone, Menu, X, Home, HeartHandshake, Calendar, User, Info, Building2, HelpCircle, Settings, LogOut } from 'lucide-react';

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

      <Link href="/" className="brand" aria-label="Caresy home">
        <svg className="brand-icon" viewBox="0 0 24 24" width="22" height="22" fill="var(--marigold)" stroke="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span className="brand-text" style={{ textTransform: 'lowercase', fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--paper)' }}>caresy</span>
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

        <Link className={isHome ? 'active' : ''} href="/"><Home style={{ width: '18px', height: '18px' }} /> Home</Link>
        <Link className={isServices ? 'active' : ''} href="/services"><HeartHandshake style={{ width: '18px', height: '18px' }} /> Services</Link>
        
        {user ? (
          <>
            <Link className={isTrack ? 'active' : ''} href="/my-bookings"><Calendar style={{ width: '18px', height: '18px' }} /> Bookings</Link>
            <Link href="/my-bookings#profile"><User style={{ width: '18px', height: '18px' }} /> Profile</Link>
          </>
        ) : (
          <button onClick={() => { closeNav(); openLogin(); }} style={{ background: 'none', border: 'none', padding: '10px 14px', borderRadius: '999px', color: 'rgba(245, 244, 238, 0.85)', fontSize: '0.92rem', fontWeight: 760, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <User style={{ width: '18px', height: '18px' }} /> Log In / Sign Up
          </button>
        )}

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
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <Link className="btn nav-quick" href="/quick-help" style={{ fontSize: '0.84rem', padding: '6px 14px', borderRadius: '999px', fontWeight: 800, textDecoration: 'none' }}>
          Need help today
        </Link>
        <Link className="btn nav-quick" href="/booking" style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'rgba(255, 255, 255, 0.35)', fontSize: '0.84rem', padding: '6px 14px', borderRadius: '999px', fontWeight: 800, textDecoration: 'none' }}>
          Book for later
        </Link>

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
