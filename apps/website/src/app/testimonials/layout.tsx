import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Testimonials',
  description: 'Real stories from families who used Caresy hospital companions in Noida & Greater Noida.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
