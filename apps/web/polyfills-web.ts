// apps/web/polyfills-web.ts
// MUST run before React initializes
import 'react-native-get-random-values';
import process from 'process/browser';

declare global {
  interface Window { 
    process: any; 
    Buffer: any;
    global: any;
  }
}

// Set up global polyfills
if (typeof window !== 'undefined') {
  console.log('[Polyfills] Loading polyfills...');
  
  // Set process
  if (!window.process) {
    window.process = process;
    console.log('[Polyfills] ✓ window.process set');
  }
  
  // Set global to window
  if (!window.global) {
    window.global = window;
    console.log('[Polyfills] ✓ window.global set');
  }
  
  // Try to load Buffer dynamically to avoid Metro module resolution issues
  (async () => {
    try {
      const bufferModule = await import('buffer');
      if (bufferModule.Buffer && !window.Buffer) {
        window.Buffer = bufferModule.Buffer;
        console.log('[Polyfills] ✓ window.Buffer set (async)');
      }
    } catch (e) {
      console.warn('[Polyfills] ⚠ Could not load Buffer polyfill:', e);
    }
  })();
  
  console.log('[Polyfills] Polyfills loaded');
  console.log('[Polyfills] window.process:', typeof window.process);
  console.log('[Polyfills] window.global:', typeof window.global);
}
