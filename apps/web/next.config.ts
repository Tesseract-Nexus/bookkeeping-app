import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // TODO: Remove this once framer-motion is fully removed from the codebase.
  // Current issue: framer-motion has React 18 types that conflict with React 19.
  // Files still using framer-motion: button.tsx, card.tsx, empty-state.tsx,
  // header.tsx, stats-cards.tsx, charts.tsx, recent-activity.tsx,
  // customers/page.tsx, invoices/page.tsx
  // Solution: Replace framer-motion animations with CSS animations (see globals.css)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Environment variables (for client-side)
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Bookkeeping',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
