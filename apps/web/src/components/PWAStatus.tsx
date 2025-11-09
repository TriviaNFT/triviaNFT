/**
 * PWA Status Indicator
 * Shows connection status and PWA mode
 */

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { isStandalone, isOnline, onConnectionChange } from '../utils/serviceWorker';

interface PWAStatusProps {
  /**
   * Show only when offline
   * Default: true
   */
  showOnlyWhenOffline?: boolean;
}

export function PWAStatus({ showOnlyWhenOffline = true }: PWAStatusProps) {
  const [online, setOnline] = useState(isOnline());
  const [standalone] = useState(isStandalone());

  useEffect(() => {
    // Listen for connection changes
    const cleanup = onConnectionChange((isOnline) => {
      setOnline(isOnline);
    });

    return cleanup;
  }, []);

  // Don't show if online and configured to show only when offline
  if (online && showOnlyWhenOffline) {
    return null;
  }

  return (
    <View className="fixed top-0 left-0 right-0 z-50">
      {!online && (
        <View className="bg-yellow-600 py-2 px-4">
          <Text className="text-white text-center text-sm font-medium">
            ⚠️ You're offline. Some features may be limited.
          </Text>
        </View>
      )}
      
      {standalone && !showOnlyWhenOffline && (
        <View className="bg-primary/10 py-1 px-4">
          <Text className="text-primary text-center text-xs">
            Running as installed app
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Connection status badge
 */
export function ConnectionBadge() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = onConnectionChange((isOnline) => {
      setOnline(isOnline);
    });

    return cleanup;
  }, []);

  return (
    <View className="flex-row items-center">
      <View 
        className={`w-2 h-2 rounded-full mr-2 ${
          online ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <Text className={`text-xs ${online ? 'text-green-500' : 'text-red-500'}`}>
        {online ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}
