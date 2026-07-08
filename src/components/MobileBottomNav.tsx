'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, Calendar, Headset, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, openLogin } = useAuth();

  const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
  const isBookings = pathname === '/my-bookings';
  const isSupport = pathname === '/support';
  const isProfile = pathname === '/profile';

  const handleBookingsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openLogin('/my-bookings');
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openLogin('/profile');
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
        <span>Bookings</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isSupport ? 'active' : ''}`} href="/support">
        <span className="mobile-bottom-nav-icon"><Headset style={{ width: '20px', height: '20px' }} /></span>
        <span>Support</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isProfile ? 'active' : ''}`} href="/profile" onClick={handleProfileClick}>
        <span className="mobile-bottom-nav-icon"><User style={{ width: '20px', height: '20px' }} /></span>
        <span>Profile</span>
      </Link>
    </nav>
  );
}
