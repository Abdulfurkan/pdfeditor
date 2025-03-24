/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Canvas and related modules should only be imported on client-side
    if (!isServer) {
      // Handle canvas dependency for react-pdf
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
        // Add Node.js core modules fallbacks for client-side
        fs: false,
        os: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        util: require.resolve('util/'),
      };
    }

    return config;
  },
  // Ensure we transpile the googleapis package
  transpilePackages: ['googleapis', 'google-auth-library'],
};

module.exports = nextConfig;
