import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { AuthProvider } from '@caresy/auth';
import AuthModal from '@caresy/auth/modal';
import { PortalHeader } from '../components/PortalHeader';
import './globals.css';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caresy Companion Portal',
  description: 'Portal for Caresy hospital companions: registration, jobs, and availability.',
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
      <body className={`${poppins.className} min-h-full`} style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <AuthProvider>
          <PortalHeader />
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
