/**
 * Common Style Utilities
 * 
 * Reusable inline styles to replace NativeWind classes that don't work
 * with our current Metro config (web builds skip withNativeWind wrapper).
 * 
 * Use these instead of className for critical layout/positioning styles.
 */

import { ViewStyle, TextStyle } from 'react-native';

// Layout & Flexbox
export const flex = {
  flex1: { flex: 1 } as ViewStyle,
  flexRow: { flexDirection: 'row' } as ViewStyle,
  flexCol: { flexDirection: 'column' } as ViewStyle,
};

export const justify = {
  center: { justifyContent: 'center' } as ViewStyle,
  start: { justifyContent: 'flex-start' } as ViewStyle,
  end: { justifyContent: 'flex-end' } as ViewStyle,
  between: { justifyContent: 'space-between' } as ViewStyle,
  around: { justifyContent: 'space-around' } as ViewStyle,
  evenly: { justifyContent: 'space-evenly' } as ViewStyle,
};

export const align = {
  center: { alignItems: 'center' } as ViewStyle,
  start: { alignItems: 'flex-start' } as ViewStyle,
  end: { alignItems: 'flex-end' } as ViewStyle,
  stretch: { alignItems: 'stretch' } as ViewStyle,
};

// Common Combinations
export const centered = {
  justifyContent: 'center',
  alignItems: 'center',
} as ViewStyle;

export const flexRowCentered = {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
} as ViewStyle;

export const flexRowBetween = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
} as ViewStyle;

// Modal Overlays
export const modalOverlay = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  justifyContent: 'center',
  alignItems: 'center',
} as ViewStyle;

export const modalOverlayLight = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
} as ViewStyle;

export const modalOverlayDark = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  justifyContent: 'center',
  alignItems: 'center',
} as ViewStyle;

// Positioning
export const absolute = {
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  
  topLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  } as ViewStyle,
  
  topRight: {
    position: 'absolute',
    top: 0,
    right: 0,
  } as ViewStyle,
  
  bottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  } as ViewStyle,
  
  bottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  } as ViewStyle,
  
  center: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  } as ViewStyle,
};

// Text Alignment
export const text = {
  center: { textAlign: 'center' } as TextStyle,
  left: { textAlign: 'left' } as TextStyle,
  right: { textAlign: 'right' } as TextStyle,
  justify: { textAlign: 'justify' } as TextStyle,
};

// Opacity
export const opacity = {
  0: { opacity: 0 } as ViewStyle,
  25: { opacity: 0.25 } as ViewStyle,
  50: { opacity: 0.5 } as ViewStyle,
  75: { opacity: 0.75 } as ViewStyle,
  100: { opacity: 1 } as ViewStyle,
};

// Z-Index
export const zIndex = {
  0: { zIndex: 0 } as ViewStyle,
  10: { zIndex: 10 } as ViewStyle,
  20: { zIndex: 20 } as ViewStyle,
  30: { zIndex: 30 } as ViewStyle,
  40: { zIndex: 40 } as ViewStyle,
  50: { zIndex: 50 } as ViewStyle,
  100: { zIndex: 100 } as ViewStyle,
};

// Helper function to combine styles
export const combine = (...styles: (ViewStyle | TextStyle | undefined | false)[]): ViewStyle | TextStyle => {
  return Object.assign({}, ...styles.filter(Boolean));
};

// Usage Examples:
// 
// // Simple usage
// <View style={centered}>...</View>
// 
// // Combining styles
// <View style={combine(flex.flex1, centered)}>...</View>
// 
// // With custom styles
// <View style={combine(modalOverlay, { padding: 20 })}>...</View>
// 
// // Conditional styles
// <View style={combine(
//   flex.flex1,
//   isLoading && opacity[50]
// )}>...</View>
