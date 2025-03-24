/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle the canvas module differently for client and server
    if (!isServer) {
      // Client-side: provide empty modules for Node.js specific modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        process: false,
      };
    }
    
    return config;
  },
  // Add this to avoid issues with the canvas module
  serverExternalPackages: ['canvas'],
};

export default nextConfig;
