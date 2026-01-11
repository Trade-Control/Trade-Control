import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages configuration
  output: 'standalone',
  // Enable experimental features for Cloudflare Pages compatibility
  experimental: {
    // Cloudflare Pages works with standard Next.js output
  },
};

export default nextConfig;
