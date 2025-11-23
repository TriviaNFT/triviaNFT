import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to manage focus ring state for keyboard navigation accessibility.
 * Provides consistent focus indicators across all breakpoints.
 * 
 * @returns Object with focus state and handlers
 */
export function useFocusRing() {
  const [isFocused, setIsFocused] = useState(false);

  const onFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  /**
   * Get focus ring styles for React Native components
   */
  const getFocusRingStyle = useCallback((customColor?: string) => {
    if (!isFocused) return {};

    const focusColor = customColor || '#8A5CF6'; // Default to primary violet

    return {
      borderWidth: 3,
      borderColor: focusColor,
      ...(Platform.OS === 'web' && {
        // @ts-ignore - Web-only CSS property
        outline: `3px solid ${focusColor}`,
        // @ts-ignore - Web-only CSS property
        outlineOffset: '2px',
        // @ts-ignore - Web-only CSS property
        boxShadow: `0 0 0 3px ${focusColor}40`, // 40 = 25% opacity in hex
      }),
    };
  }, [isFocused]);

  /**
   * Get focus ring class names for NativeWind/Tailwind
   */
  const getFocusRingClass = useCallback((customClass?: string) => {
    if (!isFocused) return '';
    
    return customClass || 'ring-4 ring-primary-500 ring-offset-2 ring-offset-background-DEFAULT';
  }, [isFocused]);

  return {
    isFocused,
    onFocus,
    onBlur,
    getFocusRingStyle,
    getFocusRingClass,
  };
}
