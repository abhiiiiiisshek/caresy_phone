'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Home, Calendar, Headset } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, openLogin } = useAuth();

  // Transactional/auth screens are full-screen and suppress the tab bar.
  if (pathname === '/login' || pathname === '/booking' || pathname === '/tracking') return null;

  const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
  const isBookings = pathname === '/my-bookings';
  const isSupport = pathname === '/support';

  const handleBookingsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openLogin('/my-bookings');
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link className={`mobile-bottom-nav-item ${isHome ? 'active' : ''}`} href="/">
        <span className="mobile-bottom-nav-icon"><Home style={{ width: '20px', height: '20px' }} /></span>
        <span>Home</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isBookings ? 'active' : ''}`} href="/my-bookings" onClick={handleBookingsClick}>
        <span className="mobile-bottom-nav-icon"><Calendar style={{ width: '20px', height: '20px' }} /></span>
        <span>Booking</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isSupport ? 'active' : ''}`} href="/support">
        <span className="mobile-bottom-nav-icon"><Headset style={{ width: '20px', height: '20px' }} /></span>
        <span>Support</span>
      </Link>
    </nav>
  );
}
