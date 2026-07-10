import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async redirects() {
    return [
      { source: '/contact', destination: '/support', permanent: true },
      { source: '/faq', destination: '/support', permanent: true },
      // Companion portal now lives on its own app/domain (apps/companion)
      { source: '/companion', destination: 'https://companion.caresy.in', permanent: false },
    ];
  },
};

export default nextConfig;
