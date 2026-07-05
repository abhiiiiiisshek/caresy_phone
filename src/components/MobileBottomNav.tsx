'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, HeartHandshake, Calendar, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openLogin } = useAuth();

  const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
  const isServices = pathname === '/services';
  const isBookings = pathname === '/my-bookings';

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openLogin(() => {
        router.push('/my-bookings#profile');
      });
    }
  };

  const handleBookingsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openLogin(() => {
        router.push('/my-bookings');
      });
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link className={`mobile-bottom-nav-item ${isHome ? 'active' : ''}`} href="/">
        <Home style={{ width: '20px', height: '20px' }} />
        <span>Home</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isServices ? 'active' : ''}`} href="/services">
        <HeartHandshake style={{ width: '20px', height: '20px' }} />
        <span>Services</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isBookings ? 'active' : ''}`} href="/my-bookings" onClick={handleBookingsClick}>
        <Calendar style={{ width: '20px', height: '20px' }} />
        <span>Bookings</span>
      </Link>
      <Link className="mobile-bottom-nav-item" href="/my-bookings#profile" onClick={handleProfileClick}>
        <User style={{ width: '20px', height: '20px' }} />
        <span>Profile</span>
      </Link>
    </nav>
  );
}
