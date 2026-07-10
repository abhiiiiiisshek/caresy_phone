import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
