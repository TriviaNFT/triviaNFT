import React, { Suspense } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: number;
}

/**
 * Wrapper component for lazy-loaded components.
 * Provides a loading state while the component is being loaded.
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  fallback,
  minHeight = 200,
}) => {
  const defaultFallback = (
    <View
      className="flex-1 items-center justify-center bg-background"
      style={{ minHeight }}
    >
      <ActivityIndicator size="large" color="#6d4ee3" />
      <Text className="text-text-secondary mt-4 text-sm">Loading...</Text>
    </View>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};
