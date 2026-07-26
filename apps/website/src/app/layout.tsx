import type { Metadata, Viewport } from 'next';
import { Poppins, Epilogue } from 'next/font/google';
import { AuthProvider } from '@caresy/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import CookieBanner from '@/components/CookieBanner';
import AuthModal from '@caresy/auth/modal';
import RegisterSW from '@/components/RegisterSW';
import InstallPrompt from '@/components/InstallPrompt';
import NativeBridge from '@/components/NativeBridge';
import './globals.css';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

const epilogue = Epilogue({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-epilogue',
});

const SITE_DESCRIPTION =
  'Caresy provides trusted, verified hospital companions in Noida & Greater Noida for families who cannot be physically present. Same-day urgent help or scheduled visits.';

export const metadata: Metadata = {
  metadataBase: new URL('https://caresy.co.in'),
  title: {
    default: 'Caresy | Your Care, Our Priority',
    template: '%s | Caresy',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'hospital companion',
    'patient attendant',
    'hospital help Noida',
    'hospital companion Greater Noida',
    'medical appointment assistance',
    'elderly hospital support',
    'patient care services Noida',
  ],
  openGraph: {
    type: 'website',
    url: 'https://caresy.co.in',
    siteName: 'Caresy',
    locale: 'en_IN',
    title: 'Caresy | Your Care, Our Priority',
    description: SITE_DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Caresy — trusted hospital companions' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Caresy | Your Care, Our Priority',
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: 'Caresy', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  themeColor: '#16302b',
  // Lets env(safe-area-inset-*) resolve inside the native app webview.
  viewportFit: 'cover',
};

// LocalBusiness structured data so Google can surface Caresy as a business
// (logo, area served, contact) in search results.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://caresy.co.in/#business',
  name: 'Caresy',
  slogan: 'Your Care, Our Priority',
  description: SITE_DESCRIPTION,
  url: 'https://caresy.co.in',
  logo: 'https://caresy.co.in/icon-512.png',
  image: 'https://caresy.co.in/og-image.png',
  telephone: '+91-9717500225',
  areaServed: [
    { '@type': 'City', name: 'Noida' },
    { '@type': 'City', name: 'Greater Noida' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Noida',
    addressRegion: 'Uttar Pradesh',
    addressCountry: 'IN',
  },
  priceRange: '₹₹',
  knowsAbout: ['hospital companions', 'patient assistance', 'medical appointment support'],
  sameAs: ['https://wa.me/919717500225'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${poppins.className} ${epilogue.variable} min-h-full flex flex-col`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only" style={{ position: 'absolute', left: '-9999px' }}>
            Skip to content
          </a>
          <Header />
          <div style={{ flex: '1 0 auto' }}>
            {children}
          </div>
          <Footer />
          <MobileBottomNav />
          <WhatsAppWidget />
          <CookieBanner />
          <AuthModal />
          <RegisterSW />
          <InstallPrompt />
          <NativeBridge />
        </AuthProvider>
      </body>
    </html>
  );
}
