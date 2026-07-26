import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Hospitals',
  description: 'Partner with Caresy to give your patients verified companion support for admissions, appointments, and discharge.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
