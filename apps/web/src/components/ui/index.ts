/**
 * UI Components Export
 * 
 * Centralized export for all UI components.
 */

// Existing components
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

export { Timer } from './Timer';
export type { TimerProps, TimerSize } from './Timer';

export { Toast } from './Toast';
export type { ToastProps, ToastType } from './Toast';

export { ProgressIndicator } from './ProgressIndicator';
export type { ProgressIndicatorProps } from './ProgressIndicator';

// New responsive components
export { Container } from './Container';
export type { ContainerProps } from './Container';

export { Grid } from './Grid';
export type { GridProps } from './Grid';

export { Stack } from './Stack';
export type { StackProps } from './Stack';

// New touch-optimized components
export { TouchableCard } from './TouchableCard';
export type { TouchableCardProps } from './TouchableCard';

// New performance components
export { OptimizedImage } from './OptimizedImage';
export type { OptimizedImageProps } from './OptimizedImage';
export { getResponsiveImageSource } from './OptimizedImage';

export { VirtualList } from './VirtualList';
export type { VirtualListProps } from './VirtualList';
