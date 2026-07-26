import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trust & Safety',
  description: 'Every Caresy companion passes strict background checks, interviews, and certification reviews before their first assignment.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
