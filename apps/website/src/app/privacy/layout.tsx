import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Caresy collects, uses, and protects your personal and patient information.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
