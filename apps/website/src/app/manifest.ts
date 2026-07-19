import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Caresy — Your Care, Our Priority',
    short_name: 'Caresy',
    description: 'Trusted hospital companions for families who cannot be physically present.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8faf5',
    theme_color: '#16302b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
