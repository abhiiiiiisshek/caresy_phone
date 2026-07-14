import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { AuthProvider } from '@caresy/auth';
import AuthModal from '@caresy/auth/modal';
import './globals.css';
import './admin.css';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caresy Admin',
  description: 'Caresy operations dashboard.',
  robots: { index: false, follow: false },
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
        <AuthProvider onboarding={false}>
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
