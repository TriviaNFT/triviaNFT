/**
 * Service Worker Update Notification
 * Shows a banner when a new version is available
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { registerServiceWorker } from '../utils/serviceWorker';

export function ServiceWorkerUpdate() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      onSuccess: () => {
        console.log('Service worker registered successfully');
      },
      onUpdate: (reg) => {
        console.log('New service worker available');
        setRegistration(reg);
        setShowUpdate(true);
      },
      onError: (error) => {
        console.error('Service worker registration error:', error);
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page when the new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <View className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-primary rounded-lg shadow-lg p-4 z-50">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-white font-semibold text-base flex-1">
          New Version Available
        </Text>
        <Pressable
          onPress={handleDismiss}
          className="ml-2 p-1"
          accessibilityLabel="Dismiss update notification"
        >
          <Text className="text-gray-400 text-lg">×</Text>
        </Pressable>
      </View>
      
      <Text className="text-gray-300 text-sm mb-4">
        A new version of TriviaNFT is available. Update now for the latest features and improvements.
      </Text>
      
      <View className="flex-row gap-2">
        <Pressable
          onPress={handleUpdate}
          className="flex-1 bg-primary rounded-lg py-2 px-4 active:opacity-80"
          accessibilityLabel="Update now"
        >
          <Text className="text-dark font-semibold text-center">
            Update Now
          </Text>
        </Pressable>
        
        <Pressable
          onPress={handleDismiss}
          className="flex-1 bg-gray-700 rounded-lg py-2 px-4 active:opacity-80"
          accessibilityLabel="Update later"
        >
          <Text className="text-white font-semibold text-center">
            Later
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
