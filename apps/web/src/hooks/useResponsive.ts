import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook to detect current screen size and breakpoint.
 * Provides responsive utilities for conditional rendering.
 */
export const useResponsive = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const { width, height } = Dimensions.get('window');
    return calculateScreenSize(width, height);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenSize(calculateScreenSize(window.width, window.height));
    });

    return () => subscription?.remove();
  }, []);

  return screenSize;
};

function calculateScreenSize(width: number, height: number): ScreenSize {
  let breakpoint: ScreenSize['breakpoint'] = 'sm';
  
  if (width >= BREAKPOINTS['2xl']) {
    breakpoint = '2xl';
  } else if (width >= BREAKPOINTS.xl) {
    breakpoint = 'xl';
  } else if (width >= BREAKPOINTS.lg) {
    breakpoint = 'lg';
  } else if (width >= BREAKPOINTS.md) {
    breakpoint = 'md';
  }

  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
  };
}

/**
 * Hook to check if screen matches a specific breakpoint or larger.
 */
export const useMediaQuery = (minWidth: keyof typeof BREAKPOINTS): boolean => {
  const { width } = useResponsive();
  return width >= BREAKPOINTS[minWidth];
};
