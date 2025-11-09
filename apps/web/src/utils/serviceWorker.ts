/**
 * Service Worker Registration and Management
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(
  config?: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('Service worker registered:', registration);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available');
            config?.onUpdate?.(registration);
          } else {
            // Service worker installed for the first time
            console.log('Service worker installed');
            config?.onSuccess?.(registration);
          }
        }
      });
    });

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    config?.onError?.(error as Error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      const success = await registration.unregister();
      console.log('Service worker unregistered:', success);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is registered
 */
export async function isServiceWorkerRegistered(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration;
  } catch (error) {
    console.error('Failed to check service worker registration:', error);
    return false;
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: any): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('No active service worker to send message to');
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  sendMessageToServiceWorker({ type: 'SKIP_WAITING' });
}

/**
 * Clear service worker cache
 */
export function clearServiceWorkerCache(): void {
  sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
}

/**
 * Cache additional URLs
 */
export function cacheUrls(urls: string[]): void {
  sendMessageToServiceWorker({ type: 'CACHE_URLS', urls });
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(
  callback: (event: MessageEvent) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('message', callback);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', callback);
  };
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  // Check if running as installed PWA
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onConnectionChange(
  callback: (online: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
