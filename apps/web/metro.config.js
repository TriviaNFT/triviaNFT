// apps/web/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const MetroSymlinksResolver = require('@rnx-kit/metro-resolver-symlinks');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Exclude problematic paths
config.resolver.blockList = [
  // Exclude other workspace node_modules to prevent duplicate React
  /\/apps\/mobile\/node_modules\/.*/,
  /\/services\/api\/node_modules\/.*/,
  /\/packages\/shared\/node_modules\/.*/,
  /\/infra\/node_modules\/.*/,
  // Exclude NativeWind cache files that cause SHA-1 issues
  /react-native-css-interop\/\.cache\/.*/,
  /\.cache\/web\.css$/,
  /node_modules\/.*\/\.cache\/.*/,
  // Exclude Next.js API routes (only used in Vercel deployment, not Expo)
  /\/app\/api\/.*\/route\.ts$/,
];

// Allow require.context (used by expo-router)
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Custom resolver that forces React to resolve from workspace root
const symlinkResolver = MetroSymlinksResolver();

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  resolveRequest: (context, moduleName, platform) => {
    // Force React and React Navigation packages to always resolve from workspace root
    const packagesToForce = [
      'react',
      'react-dom',
      'react-native',
      'react-native-web',
      '@react-navigation/core',
      '@react-navigation/native',
      '@react-navigation/elements',
    ];
    
    for (const pkg of packagesToForce) {
      if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
        try {
          const pkgPath = path.resolve(workspaceRoot, 'node_modules', pkg);
          return {
            type: 'sourceFile',
            filePath: require.resolve(moduleName, { paths: [pkgPath] }),
          };
        } catch (e) {
          // If resolution fails, fall through to symlink resolver
          break;
        }
      }
    }
    
    // Use symlink resolver for everything else
    return symlinkResolver(context, moduleName, platform);
  },
};

// Wrap with NativeWind to enable Tailwind CSS processing
module.exports = withNativeWind(config, { input: './global.css' });
