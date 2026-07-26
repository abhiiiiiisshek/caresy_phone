'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Home, Calendar, Headset, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Transactional/auth screens are full-screen and suppress the tab bar.
  if (pathname === '/login' || pathname === '/booking' || pathname === '/tracking') return null;

  const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
  const isBookings = pathname === '/my-bookings';
  const isSupport = pathname === '/support';
  const isProfile = pathname === '/profile';

  // Guests get the booking form; signed-in users get their booking history.
  // Nothing here intercepts the tap — /my-bookings and /profile own their own
  // sign-in prompts, and a login popup fired from a tab bar reads as a wall.
  const bookingHref = user ? '/my-bookings' : '/booking';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link className={`mobile-bottom-nav-item ${isHome ? 'active' : ''}`} href="/">
        <span className="mobile-bottom-nav-icon"><Home style={{ width: '20px', height: '20px' }} /></span>
        <span>Home</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isBookings ? 'active' : ''}`} href={bookingHref}>
        <span className="mobile-bottom-nav-icon"><Calendar style={{ width: '20px', height: '20px' }} /></span>
        <span>Booking</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isSupport ? 'active' : ''}`} href="/support">
        <span className="mobile-bottom-nav-icon"><Headset style={{ width: '20px', height: '20px' }} /></span>
        <span>Support</span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isProfile ? 'active' : ''}`} href="/profile">
        <span className="mobile-bottom-nav-icon"><User style={{ width: '20px', height: '20px' }} /></span>
        <span>Profile</span>
      </Link>
    </nav>
  );
}
