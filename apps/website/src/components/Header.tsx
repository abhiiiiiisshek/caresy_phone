'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';

// Titles for the M3 back-bar shown on secondary (marketing/legal) pages.
// The 4 app tabs and the full-screen transactional screens render their own
// chrome and never reach this component.
const TITLES: Record<string, string> = {
  '/services': 'Our Services',
  '/trust': 'Trust & Safety',
  '/how-it-works': 'How It Works',
  '/about': 'About Caresy',
  '/for-hospitals': 'For Hospitals',
  '/quick-help': 'Urgent Help',
  '/testimonials': 'Testimonials',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
};

const APP_TABS = ['/', '/index.html', '', '/my-bookings', '/support', '/profile'];
const STANDALONE = ['/login', '/booking', '/tracking'];

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  const slug = pathname.replace(/^\//, '').split('/')[0] || 'Caresy';
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  if (APP_TABS.includes(pathname) || STANDALONE.includes(pathname)) return null;

  return (
    <header className="m3-topbar">
      <button onClick={() => router.back()} aria-label="Go back" className="m3-topbar-btn">
        <ArrowLeft style={{ width: 20, height: 20 }} />
      </button>
      <span className="m3-topbar-title">{titleFor(pathname)}</span>
      <a href="tel:+919717500225" aria-label="Call Caresy" className="m3-topbar-btn">
        <Phone style={{ width: 20, height: 20 }} />
      </a>
    </header>
  );
}
