const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { makeMetroConfig } = require('@rnx-kit/metro-config');
const MetroSymlinksResolver = require('@rnx-kit/metro-resolver-symlinks');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Get default Expo config
const config = getDefaultConfig(projectRoot);

// 🔻 Narrow what Metro watches (avoid watching the entire monorepo root)
config.watchFolders = [
  // Only include shared packages you actually import
  path.resolve(workspaceRoot, 'packages/shared'),
];

// Keep both node_modules paths
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ✅ pnpm + Windows
config.resolver.unstable_enableSymlinks = true;
// ⛔ turn OFF package exports enforcement so deep files/aliases resolve
config.resolver.unstable_enablePackageExports = false;

// Use symlink-aware resolver
config.resolver.resolveRequest = MetroSymlinksResolver();

// Add cjs and mjs
const { sourceExts } = config.resolver;
config.resolver.sourceExts = Array.from(new Set([...(sourceExts || []), 'cjs', 'mjs']));

// 🔑 Force single React instance (prevents "Invalid hook call" errors)
// This is critical in pnpm monorepos to avoid duplicate React copies
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // React deduplication
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
  'react-dom': path.resolve(workspaceRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(workspaceRoot, 'node_modules/react-native-web'),
  // Polyfills
  process: require.resolve('process/browser'),
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('crypto-browserify'),
  vm: require.resolve('vm-browserify'),
  buffer: require.resolve('buffer'),
};

// Export with NativeWind to handle Tailwind CSS
module.exports = withNativeWind(config, { input: './global.css' });
