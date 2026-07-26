import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Book in minutes: choose urgent or scheduled help, we match a verified companion, and your family stays updated at every step.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
