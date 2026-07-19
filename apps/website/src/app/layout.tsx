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

export const metadata: Metadata = {
  title: 'Caresy | Your Care, Our Priority',
  description: 'Caresy provides trusted hospital companions for families who cannot be physically present.',
  appleWebApp: { capable: true, title: 'Caresy', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  themeColor: '#16302b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${poppins.className} ${epilogue.variable} min-h-full flex flex-col`}>
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
        </AuthProvider>
      </body>
    </html>
  );
}
