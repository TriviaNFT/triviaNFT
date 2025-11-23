import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      env: {
        // Make all env vars available to tests
        ...env,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.expo/**',
        '**/e2e/**', // Exclude Playwright e2e tests
        '**/*.spec.ts', // Exclude Playwright spec files
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react-native': 'react-native-web',
        'next/server': path.resolve(__dirname, './test-mocks/next-server.ts'),
      },
    },
  };
});
