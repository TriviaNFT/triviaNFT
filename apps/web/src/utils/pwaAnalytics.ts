/**
 * PWA Analytics Tracking
 * Track PWA-specific events for monitoring and optimization
 */

export interface PWAEvent {
  event: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * Track PWA event
 */
export function trackPWAEvent(event: string, data?: Record<string, any>): void {
  const eventData: PWAEvent = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  // Log to console in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('[PWA Analytics]', eventData);
  }

  // Store in localStorage for basic tracking
  try {
    const events = getPWAEvents();
    events.push(eventData);
    
    // Keep only last 100 events
    const recentEvents = events.slice(-100);
    localStorage.setItem('pwa_events', JSON.stringify(recentEvents));
  } catch (error) {
    console.error('Failed to track PWA event:', error);
  }

  // TODO: Send to analytics service
  // Example: analytics.track(event, data);
}

/**
 * Get stored PWA events
 */
export function getPWAEvents(): PWAEvent[] {
  try {
    const stored = localStorage.getItem('pwa_events');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get PWA events:', error);
    return [];
  }
}

/**
 * Clear PWA events
 */
export function clearPWAEvents(): void {
  try {
    localStorage.removeItem('pwa_events');
  } catch (error) {
    console.error('Failed to clear PWA events:', error);
  }
}

/**
 * Track install prompt shown
 */
export function trackInstallPromptShown(): void {
  trackPWAEvent('install_prompt_shown', {
    userAgent: navigator.userAgent,
    standalone: window.matchMedia('(display-mode: standalone)').matches
  });
}

/**
 * Track install prompt accepted
 */
export function trackInstallPromptAccepted(): void {
  trackPWAEvent('install_prompt_accepted', {
    userAgent: navigator.userAgent
  });
}

/**
 * Track install prompt dismissed
 */
export function trackInstallPromptDismissed(): void {
  trackPWAEvent('install_prompt_dismissed', {
    userAgent: navigator.userAgent
  });
}

/**
 * Track app installed
 */
export function trackAppInstalled(): void {
  trackPWAEvent('app_installed', {
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
}

/**
 * Track service worker registered
 */
export function trackServiceWorkerRegistered(): void {
  trackPWAEvent('service_worker_registered', {
    userAgent: navigator.userAgent
  });
}

/**
 * Track service worker updated
 */
export function trackServiceWorkerUpdated(): void {
  trackPWAEvent('service_worker_updated', {
    userAgent: navigator.userAgent
  });
}

/**
 * Track offline mode
 */
export function trackOfflineMode(online: boolean): void {
  trackPWAEvent('connection_change', {
    online,
    userAgent: navigator.userAgent
  });
}

/**
 * Track standalone mode
 */
export function trackStandaloneMode(): void {
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  trackPWAEvent('standalone_mode', {
    standalone: isStandalone,
    userAgent: navigator.userAgent
  });
}

/**
 * Get PWA statistics
 */
export function getPWAStatistics(): {
  totalEvents: number;
  installPromptShown: number;
  installPromptAccepted: number;
  installPromptDismissed: number;
  appInstalled: number;
  serviceWorkerRegistered: number;
  serviceWorkerUpdated: number;
  offlineEvents: number;
} {
  const events = getPWAEvents();

  return {
    totalEvents: events.length,
    installPromptShown: events.filter(e => e.event === 'install_prompt_shown').length,
    installPromptAccepted: events.filter(e => e.event === 'install_prompt_accepted').length,
    installPromptDismissed: events.filter(e => e.event === 'install_prompt_dismissed').length,
    appInstalled: events.filter(e => e.event === 'app_installed').length,
    serviceWorkerRegistered: events.filter(e => e.event === 'service_worker_registered').length,
    serviceWorkerUpdated: events.filter(e => e.event === 'service_worker_updated').length,
    offlineEvents: events.filter(e => e.event === 'connection_change' && e.data?.online === false).length
  };
}
