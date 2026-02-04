const withPWA = require('@ducanh2912/next-pwa').default;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for highlighting potential issues
  reactStrictMode: true,

  // Environment variables available on the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // Redirect root to dashboard (will add auth check later)
  async redirects() {
    return [];
  },

  // API rewrites for development (proxy to backend)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // Offline fallback page
  fallbacks: {
    document: '/~offline',
  },

  // Runtime caching strategies for PWA
  runtimeCaching: [
    {
      // Cache branding/theme requests (StaleWhileRevalidate, 1hr)
      urlPattern: /\/api\/branding\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'branding-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 3600, // 1 hour
        },
      },
    },
    {
      // Cache translation files (CacheFirst, 24hr)
      urlPattern: /\/locales\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'translations-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 86400, // 24 hours
        },
      },
    },
    {
      // Background sync for form submissions (NetworkOnly with backgroundSync)
      urlPattern: /\/api\/v1\/public\/submit/,
      method: 'POST',
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'report-submission-queue',
          options: {
            maxRetentionTime: 24 * 60, // 24 hours in minutes
          },
        },
      },
    },
  ],
})(nextConfig);
