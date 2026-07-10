'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Phone, X, Home, HeartHandshake, Calendar, User, Info, Building2, Headset, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@caresy/ui';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, openLogin, signOut } = useAuth();
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

  // The 4 core app tabs (Home/Bookings/Support/Profile) each own their top area
  // (greeting bar, page title, etc.) — matching the app design, which has no
  // separate hamburger/brand header. The floating pill header is reserved for
  // the secondary marketing pages (About, Services, Trust, etc.).
  const isAppTab = isHome || isTrack || pathname === '/support' || pathname === '/profile';

  // Get initials for profile badge
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'C';

  if (isAppTab) return null;

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
            <Link className={pathname === '/profile' ? 'active' : ''} href="/profile"><User style={{ width: '18px', height: '18px' }} /> Profile</Link>
          </>
        ) : (
          <Button
            variant="ghost"
            full
            onClick={() => { closeNav(); openLogin(); }}
            iconLeft={<User style={{ width: '18px', height: '18px' }} />}
            style={{ justifyContent: 'flex-start', color: 'rgba(245, 244, 238, 0.85)' }}
          >
            Log In / Sign Up
          </Button>
        )}

        <Link className={pathname === '/trust' ? 'active' : ''} href="/trust"><ShieldCheck style={{ width: '18px', height: '18px' }} /> Trust &amp; Safety</Link>
        <Link className={pathname === '/about' ? 'active' : ''} href="/about"><Info style={{ width: '18px', height: '18px' }} /> About Us</Link>
        <Link className={pathname === '/for-hospitals' ? 'active' : ''} href="/for-hospitals"><Building2 style={{ width: '18px', height: '18px' }} /> For Hospitals</Link>
        <Link className={pathname === '/support' ? 'active' : ''} href="/support"><Headset style={{ width: '18px', height: '18px' }} /> Support</Link>
        
        {isAdmin && (
          <Link className={pathname === '/admin-ops' ? 'active' : ''} href="/admin-ops" style={{ color: 'var(--marigold)' }}><Settings style={{ width: '18px', height: '18px' }} /> Admin Operations</Link>
        )}

        {user && (
          <Button
            variant="ghost"
            full
            onClick={handleLogout}
            iconLeft={<LogOut style={{ width: '18px', height: '18px' }} />}
            style={{ justifyContent: 'flex-start', color: 'var(--terracotta)', marginTop: '10px' }}
          >
            Logout
          </Button>
        )}
      </nav>

      {/* Desktop Quick Header Actions Bar */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-teal)', marginRight: '24px' }} className="hidden md:flex">
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
          <Link href="/trust">Trust</Link>
          <Link href="/support">Support</Link>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link className="btn" href="/quick-help" style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', fontSize: '0.84rem', padding: '8px 16px', borderRadius: 'var(--radius-pill)', fontWeight: 800, textDecoration: 'none', boxShadow: 'var(--shadow-pop-urgent)' }}>
            Need help today
          </Link>
          <Link className="btn" href="/booking" style={{ background: 'var(--teal)', color: '#fff', fontSize: '0.84rem', padding: '8px 16px', borderRadius: 'var(--radius-pill)', fontWeight: 800, textDecoration: 'none', boxShadow: 'var(--shadow-pop)' }}>
            Book for later
          </Link>
        </div>

        {user ? (
          <div className="user-menu-container" style={{ position: 'relative', marginLeft: '6px' }}>
            <Link href="/profile" className="brand-mark-gold" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none' }}>
              {initials}
            </Link>
          </div>
        ) : (
          <Button variant="glass" size="sm" shape="pill" onClick={() => openLogin()} style={{ marginLeft: '6px' }}>
            Login / Signup
          </Button>
        )}
      </div>
    </header>
  );
}
