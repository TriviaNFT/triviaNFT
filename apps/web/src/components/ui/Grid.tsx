import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

export interface GridProps extends ViewProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

/**
 * Responsive grid component that adapts column count based on screen size.
 */
export const Grid: React.FC<GridProps> = ({
  children,
  cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className,
  ...props
}) => {
  const getGridClasses = () => {
    const classes: string[] = [];
    
    // Default columns
    if (cols.default) {
      classes.push(`grid-cols-${cols.default}`);
    }
    
    // Responsive columns
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    return classes.join(' ');
  };

  return (
    <View
      className={`
        grid
        ${getGridClasses()}
        gap-${gap}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </View>
  );
};
