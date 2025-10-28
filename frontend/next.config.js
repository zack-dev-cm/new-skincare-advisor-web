/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Ottimizzazioni per performance embed
  compress: true,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, geolocation=*'
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          // Cache statico aggressivo per performance
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Cache breve per HTML (per aggiornamenti rapidi)
        source: '/:path*.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Handle encoding module gracefully
        encoding: false,
      };
      
      // Add alias for encoding to prevent build errors
      config.resolve.alias = {
        ...config.resolve.alias,
        encoding: false,
      };
    }
    
    // Handle node-fetch encoding issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    
    return config;
  },
  // Other configuration options if needed
};

module.exports = nextConfig;
