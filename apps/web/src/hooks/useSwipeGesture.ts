import { useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
}

export interface SwipeGestureHandlers {
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
}

/**
 * Hook to detect swipe gestures on touch devices.
 * Returns handlers to attach to a View component.
 */
export const useSwipeGesture = (config: SwipeGestureConfig): SwipeGestureHandlers => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
  } = config;

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      touchStart.current = {
        x: touch.pageX,
        y: touch.pageY,
      };
    }
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (!touchStart.current) return;

    const touch = event.nativeEvent.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.pageX - touchStart.current.x;
    const deltaY = touch.pageY - touchStart.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if swipe is primarily horizontal or vertical
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX >= minSwipeDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY >= minSwipeDistance) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    touchStart.current = null;
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
};
