/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Configure webpack to handle Expo/React Native modules
  webpack: (config, { isServer }) => {
    // Handle react-native-web
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };

    // Handle .expo files
    config.resolve.extensions = [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      ...config.resolve.extensions,
    ];

    return config;
  },

  // Transpile Expo and React Native packages
  transpilePackages: [
    'react-native',
    'react-native-web',
    'expo',
    'expo-router',
    '@expo/metro-runtime',
    'nativewind',
  ],
};

module.exports = nextConfig;
