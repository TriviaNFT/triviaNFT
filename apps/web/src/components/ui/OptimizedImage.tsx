import React, { useState, useEffect, useRef } from 'react';
import { Image, View, ActivityIndicator, Platform } from 'react-native';
import type { ImageProps, ImageSourcePropType } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

export interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;
  width?: number;
  height?: number;
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  lazy?: boolean; // Enable lazy loading for below-fold images
  priority?: boolean; // Disable lazy loading for above-fold images
}

/**
 * Optimized image component with lazy loading and responsive sizing.
 * Automatically handles loading states and errors.
 * Supports lazy loading for below-fold images to improve performance.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  width,
  height,
  aspectRatio,
  placeholder,
  fallback,
  lazy = false,
  priority = false,
  className,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const containerRef = useRef<View>(null);
  const { width: screenWidth } = useResponsive();

  // Intersection Observer for lazy loading (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || !lazy || priority || shouldLoad) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    const element = (containerRef.current as any)?._nativeTag 
      ? document.querySelector(`[data-tag="${(containerRef.current as any)._nativeTag}"]`)
      : null;

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, shouldLoad]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Get responsive image source if source is a string URL
  const getResponsiveSource = (): ImageSourcePropType => {
    if (typeof source === 'object' && 'uri' in source) {
      const uri = source.uri;
      if (uri && typeof uri === 'string' && !uri.includes('?w=')) {
        return { ...source, uri: getResponsiveImageSource(uri, screenWidth) };
      }
    }
    return source;
  };

  const containerStyle = {
    width,
    height,
    aspectRatio,
  };

  if (error && fallback) {
    return <View style={containerStyle}>{fallback}</View>;
  }

  return (
    <View 
      ref={containerRef}
      style={containerStyle} 
      className={`relative ${className || ''}`}
    >
      {loading && shouldLoad && (
        <View className="absolute inset-0 items-center justify-center bg-background-tertiary">
          {placeholder || <ActivityIndicator size="small" color="#6d4ee3" />}
        </View>
      )}
      {shouldLoad && (
        <Image
          source={getResponsiveSource()}
          style={[containerStyle, style]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          resizeMode="cover"
          {...props}
        />
      )}
      {!shouldLoad && (
        <View className="absolute inset-0 items-center justify-center bg-background-tertiary">
          {placeholder || <ActivityIndicator size="small" color="#6d4ee3" />}
        </View>
      )}
    </View>
  );
};

/**
 * Get responsive image source based on screen width.
 * Useful for serving different image sizes for different devices.
 */
export const getResponsiveImageSource = (
  baseUrl: string,
  screenWidth: number
): string => {
  if (screenWidth < 375) {
    return `${baseUrl}?w=375`; // Small mobile
  } else if (screenWidth < 768) {
    return `${baseUrl}?w=768`; // Large mobile / small tablet
  } else if (screenWidth < 1024) {
    return `${baseUrl}?w=1024`; // Tablet
  } else if (screenWidth < 1280) {
    return `${baseUrl}?w=1280`; // Small desktop
  } else {
    return `${baseUrl}?w=1920`; // Large desktop
  }
};
