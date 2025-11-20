import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Updated headers for WebContainer/SharedArrayBuffer support + CORS fixes
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            // Changed from 'require-corp' to 'credentialless' to fix CORS issues
            // This allows external resources (like Google profile images) while
            // still enabling SharedArrayBuffer for WebContainer
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            // Added to allow cross-origin resources
            value: 'cross-origin',
          },
        ],
      },
    ];
  },

  // Configure external image domains to fix profile image loading
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'githubusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
  },

  // Empty turbopack config to silence the warning
  // (WebContainer doesn't need special turbopack configuration)
  turbopack: {},

  // Webpack configuration for WebContainer compatibility
  // (only used if you explicitly run with --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false, // Added for better compatibility
      };
    }
    return config;
  },
};

export default nextConfig;