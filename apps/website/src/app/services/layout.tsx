import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'Hospital companions, appointment assistance, queue & registration support, and custom care plans across Noida & Greater Noida.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
