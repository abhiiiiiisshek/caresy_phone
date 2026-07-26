import type { MetadataRoute } from 'next';

const BASE = 'https://caresy.co.in';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<[path: string, priority: number]> = [
    ['/', 1],
    ['/booking', 0.9],
    ['/quick-help', 0.9],
    ['/services', 0.8],
    ['/how-it-works', 0.8],
    ['/for-hospitals', 0.7],
    ['/trust', 0.7],
    ['/about', 0.6],
    ['/testimonials', 0.6],
    ['/support', 0.5],
    ['/privacy', 0.3],
    ['/terms', 0.3],
  ];
  return routes.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority,
  }));
}
