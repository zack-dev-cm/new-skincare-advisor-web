/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Let Azure Static Web Apps auto-detect Next.js configuration
  // No explicit output mode - Azure will handle it
  
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Ottimizzazioni per performance embed
  compress: true,
  
  // Ensure proper trailing slash handling
  trailingSlash: false,
  
  // Don't use basePath or assetPrefix to avoid issues with Azure Static Web Apps
  // The app should work from the root of the domain

  eslint: {
    ignoreDuringBuilds: true,
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
