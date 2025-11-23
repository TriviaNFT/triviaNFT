import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

export interface GridProps extends ViewProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
}

/**
 * Responsive grid component that adapts column count based on screen size.
 * Supports breakpoint-specific column configuration and flexible gap spacing.
 */
export const Grid: React.FC<GridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className,
  ...props
}) => {
  const getGridClasses = () => {
    const classes: string[] = [];
    
    // Base columns (mobile-first, use sm breakpoint as default)
    const baseColumns = columns.sm || 1;
    classes.push(`grid-cols-${baseColumns}`);
    
    // Responsive columns
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
    
    return classes.join(' ');
  };

  const getGapClass = () => {
    if (typeof gap === 'string') {
      return gap;
    }
    return `gap-${gap}`;
  };

  return (
    <View
      className={`
        grid
        ${getGridClasses()}
        ${getGapClass()}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </View>
  );
};
