const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { ProvidePlugin } = require('webpack');

module.exports = async (env, argv) => {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add Node.js polyfills for web
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
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
