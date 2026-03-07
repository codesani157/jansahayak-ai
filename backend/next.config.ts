import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // SPA fallback: serve Expo web app for /app/* routes
      {
        source: '/app/:path((?!_expo|assets|favicon).*)',
        destination: '/app/index.html',
      },
    ];
  },
};

export default nextConfig;
