import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with your Caresy booking — WhatsApp, phone, and email support for families and patients.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
