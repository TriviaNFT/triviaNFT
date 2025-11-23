import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to detect if the user prefers reduced motion.
 * Respects the prefers-reduced-motion media query on web.
 * 
 * @returns boolean indicating if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Only check on web platform
    if (Platform.OS !== 'web') {
      return;
    }

    // Check if matchMedia is available
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (use addEventListener for better browser support)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      // @ts-ignore
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        // @ts-ignore
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation duration based on reduced motion preference.
 * Returns 0 if reduced motion is preferred, otherwise returns the provided duration.
 * 
 * @param duration - The normal animation duration in milliseconds
 * @returns The adjusted duration (0 if reduced motion is preferred)
 */
export function useAnimationDuration(duration: number): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Get whether animations should be enabled based on reduced motion preference.
 * 
 * @returns boolean indicating if animations should be enabled
 */
export function useShouldAnimate(): boolean {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}
