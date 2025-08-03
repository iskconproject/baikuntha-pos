const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  // Optimize build for Vercel
  outputFileTracing: true,
  // Skip build-time static analysis for API routes
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Disable static optimization for API routes during build
  async rewrites() {
    return [];
  },
  // Force all API routes to be dynamic
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    // Disable webpack cache in development to prevent corruption issues
    if (dev || process.env.WEBPACK_CACHE_DISABLED === 'true') {
      config.cache = false;
    }
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Optimize webpack performance and prevent cache issues
    config.optimization = {
      ...config.optimization,
      moduleIds: dev ? 'named' : 'deterministic',
    };
    
    // Additional webpack stability improvements
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.next/**'],
      };
    }
    
    return config;
  },
  env: {
    ANALYZE: process.env.ANALYZE,
  },
};

module.exports = withPWA(nextConfig);
