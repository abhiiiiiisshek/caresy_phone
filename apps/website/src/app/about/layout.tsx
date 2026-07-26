import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Why Caresy exists: trusted hospital companions so no patient in Noida & Greater Noida ever attends a hospital visit alone.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
