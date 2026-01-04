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

  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Bookkeeping',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },

  // Server-side runtime config (internal service URLs)
  serverRuntimeConfig: {
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:8080',
    CORE_SERVICE_URL: process.env.CORE_SERVICE_URL || 'http://localhost:8081',
    INVOICE_SERVICE_URL: process.env.INVOICE_SERVICE_URL || 'http://localhost:8082',
    CUSTOMER_SERVICE_URL: process.env.CUSTOMER_SERVICE_URL || 'http://localhost:8083',
    TAX_SERVICE_URL: process.env.TAX_SERVICE_URL || 'http://localhost:8084',
    REPORT_SERVICE_URL: process.env.REPORT_SERVICE_URL || 'http://localhost:8085',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT || '6379',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
  },

  // Public runtime config
  publicRuntimeConfig: {
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Bookkeeping',
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
