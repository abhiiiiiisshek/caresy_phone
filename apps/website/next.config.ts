import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async redirects() {
    return [
      { source: '/contact', destination: '/support', permanent: true },
      { source: '/faq', destination: '/support', permanent: true },
    ];
  },
};

export default nextConfig;
