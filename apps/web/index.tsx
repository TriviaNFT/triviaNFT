// apps/web/index.tsx
// Async entry point to load polyfills before expo-router
(async () => {
  if (typeof window !== 'undefined') {
    await import('./polyfills-web');
  }
  await import('expo-router/entry');
})();
