import path from "path";
import type { NextConfig } from "next";

// Sent on every response. A QA pass found none of these present.
//
// No CSP yet, deliberately: every page styles with inline `style` attributes and
// Next injects inline scripts, so an honest policy needs 'unsafe-inline' — which
// is a header that looks like protection and is not. The four below are absolute:
// they cost nothing and cannot break a page.
const SECURITY_HEADERS = [
  // Nobody frames a booking or sign-in page. Clickjacking, closed.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send the full URL within the site, only the origin to third parties — a
  // booking reference must not leak into someone else's analytics.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app asks for none of these; saying so stops any embedded content asking.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
  // Two years, subdomains included: admin. and companion. are the ones that
  // matter. Vercel serves HTTPS only, so there is nothing to break.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      { source: '/contact', destination: '/support', permanent: true },
      { source: '/faq', destination: '/support', permanent: true },
      // Companion portal now lives on its own app/domain (apps/companion)
      { source: '/companion', destination: 'https://companion.caresy.co.in', permanent: false },
      // Admin dashboard now lives on its own app/domain (apps/admin)
      { source: '/admin-ops', destination: 'https://admin.caresy.co.in/ops', permanent: false },
      { source: '/admin/:path*', destination: 'https://admin.caresy.co.in/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
