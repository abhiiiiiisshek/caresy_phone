import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { AuthProvider } from '@caresy/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import CookieBanner from '@/components/CookieBanner';
import AuthModal from '@caresy/auth/modal';
import './globals.css';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caresy | Your Care, Our Priority',
  description: 'Caresy provides trusted hospital companions for families who cannot be physically present.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${poppins.className} min-h-full flex flex-col`}>
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
        </AuthProvider>
      </body>
    </html>
  );
}
