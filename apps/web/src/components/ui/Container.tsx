import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

export interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  responsive?: boolean;
}

const maxWidthStyles: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'px-2 sm:px-3',
  md: 'px-4 sm:px-6',
  lg: 'px-6 sm:px-8 lg:px-12',
};

/**
 * Responsive container component that provides consistent padding and max-width
 * across different screen sizes.
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'xl',
  centered = true,
  padding,
  responsive = true,
  className,
  ...props
}) => {
  // Determine padding classes
  const getPaddingClasses = () => {
    if (padding) {
      return paddingStyles[padding];
    }
    // Default responsive padding if responsive is true
    if (responsive) {
      return 'px-4 sm:px-6 lg:px-8';
    }
    return '';
  };

  return (
    <View
      className={`
        w-full
        ${getPaddingClasses()}
        ${maxWidthStyles[maxWidth]}
        ${centered ? 'mx-auto' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </View>
  );
};
