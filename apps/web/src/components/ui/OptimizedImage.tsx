import React, { useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import type { ImageProps, ImageSourcePropType } from 'react-native';

export interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;
  width?: number;
  height?: number;
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Optimized image component with lazy loading and responsive sizing.
 * Automatically handles loading states and errors.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  width,
  height,
  aspectRatio,
  placeholder,
  fallback,
  className,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const containerStyle = {
    width,
    height,
    aspectRatio,
  };

  if (error && fallback) {
    return <View style={containerStyle}>{fallback}</View>;
  }

  return (
    <View style={containerStyle} className={`relative ${className || ''}`}>
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-background-tertiary">
          {placeholder || <ActivityIndicator size="small" color="#6d4ee3" />}
        </View>
      )}
      <Image
        source={source}
        style={[containerStyle, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        resizeMode="cover"
        {...props}
      />
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
