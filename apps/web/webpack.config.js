// apps/web/webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { ProvidePlugin } = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Force single React instance (prevents "Invalid hook call" errors)
  config.resolve.alias = {
    ...config.resolve.alias,
    'react': require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
  };

  // Add Node.js polyfills for browser
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    vm: require.resolve('vm-browserify'),
  };

  // Provide global polyfills
  config.plugins.push(
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  return config;
};
