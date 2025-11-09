/**
 * Hooks Export
 * 
 * Centralized export for all custom hooks.
 */

// Existing hooks
export { useCountdown } from './useCountdown';
export { useGameToasts } from './useGameToasts';
export { useInstallPrompt } from './useInstallPrompt';

// New responsive hooks
export { useResponsive, useMediaQuery } from './useResponsive';
export type { ScreenSize } from './useResponsive';

// New touch interaction hooks
export { useSwipeGesture } from './useSwipeGesture';
export type { SwipeGestureConfig, SwipeGestureHandlers } from './useSwipeGesture';

// New performance hooks
export { useNetworkStatus, useImageQuality, useShouldReduceAnimations } from './useNetworkStatus';
export type { NetworkStatus } from './useNetworkStatus';
