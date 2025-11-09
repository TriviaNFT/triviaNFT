import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink?: number;
  rtt?: number;
  saveData: boolean;
  isSlowConnection: boolean;
}

/**
 * Hook to monitor network status and connection quality.
 * Useful for adapting app behavior based on network conditions.
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => 
    getNetworkStatus()
  );

  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(getNetworkStatus());
    };

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes (if supported)
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
};

function getConnection(): any {
  if (typeof navigator === 'undefined') return null;
  return (navigator as any).connection || 
         (navigator as any).mozConnection || 
         (navigator as any).webkitConnection;
}

function getNetworkStatus(): NetworkStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection = getConnection();

  if (!connection) {
    return {
      isOnline,
      effectiveType: 'unknown',
      saveData: false,
      isSlowConnection: false,
    };
  }

  const effectiveType = connection.effectiveType || 'unknown';
  const isSlowConnection = 
    effectiveType === 'slow-2g' || 
    effectiveType === '2g' || 
    effectiveType === '3g';

  return {
    isOnline,
    effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData || false,
    isSlowConnection,
  };
}

/**
 * Hook to get recommended image quality based on network speed.
 */
export const useImageQuality = (): 'low' | 'medium' | 'high' => {
  const { isSlowConnection, saveData } = useNetworkStatus();

  if (saveData) return 'low';
  if (isSlowConnection) return 'medium';
  return 'high';
};

/**
 * Hook to determine if animations should be reduced based on network.
 */
export const useShouldReduceAnimations = (): boolean => {
  const { isSlowConnection, saveData } = useNetworkStatus();
  return isSlowConnection || saveData;
};
