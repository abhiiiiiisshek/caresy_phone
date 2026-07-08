import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/contact', destination: '/support', permanent: true },
      { source: '/faq', destination: '/support', permanent: true },
    ];
  },
};

export default nextConfig;
