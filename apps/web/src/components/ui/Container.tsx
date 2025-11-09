import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

export interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
}

const maxWidthStyles: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
};

/**
 * Responsive container component that provides consistent padding and max-width
 * across different screen sizes.
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'xl',
  centered = true,
  className,
  ...props
}) => {
  return (
    <View
      className={`
        w-full
        px-4 sm:px-6 lg:px-8
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
