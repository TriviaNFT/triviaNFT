import { useEffect, useRef, useCallback } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook to preserve state during screen resize events.
 * Ensures that form inputs, modal states, and scroll positions are maintained
 * when the viewport size changes.
 * 
 * @param preserveScrollPosition - Whether to preserve scroll position on resize
 * @returns Object with utilities for state preservation
 */
export const useStatePreservation = (preserveScrollPosition: boolean = true) => {
  const scrollPositionRef = useRef<number>(0);
  const previousBreakpointRef = useRef<string>('');

  // Save scroll position before resize
  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && preserveScrollPosition) {
      scrollPositionRef.current = window.scrollY || window.pageYOffset;
    }
  }, [preserveScrollPosition]);

  // Restore scroll position after resize
  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && preserveScrollPosition) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  }, [preserveScrollPosition]);

  // Determine current breakpoint
  const getCurrentBreakpoint = useCallback((width: number): string => {
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    return 'sm';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const { width } = Dimensions.get('window');
      const currentBreakpoint = getCurrentBreakpoint(width);

      // Only restore scroll if breakpoint actually changed
      if (previousBreakpointRef.current && previousBreakpointRef.current !== currentBreakpoint) {
        restoreScrollPosition();
      }

      previousBreakpointRef.current = currentBreakpoint;
    };

    // Save scroll position before resize
    const handleBeforeResize = () => {
      saveScrollPosition();
    };

    // Listen to dimension changes
    const subscription = Dimensions.addEventListener('change', handleResize);

    // For web, also listen to window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleBeforeResize);
    }

    // Initialize breakpoint
    const { width } = Dimensions.get('window');
    previousBreakpointRef.current = getCurrentBreakpoint(width);

    return () => {
      subscription?.remove();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleBeforeResize);
      }
    };
  }, [saveScrollPosition, restoreScrollPosition, getCurrentBreakpoint]);

  return {
    saveScrollPosition,
    restoreScrollPosition,
  };
};
