import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

export interface StackProps extends ViewProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  responsive?: {
    sm?: 'row' | 'column';
    md?: 'row' | 'column';
    lg?: 'row' | 'column';
  };
}

const alignmentMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

/**
 * Flexible stack component for arranging children in rows or columns
 * with responsive direction changes.
 */
export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  responsive,
  className,
  ...props
}) => {
  const getDirectionClasses = () => {
    const classes: string[] = [];
    
    // Default direction
    classes.push(direction === 'row' ? 'flex-row' : 'flex-col');
    
    // Responsive directions
    if (responsive?.sm) {
      classes.push(responsive.sm === 'row' ? 'sm:flex-row' : 'sm:flex-col');
    }
    if (responsive?.md) {
      classes.push(responsive.md === 'row' ? 'md:flex-row' : 'md:flex-col');
    }
    if (responsive?.lg) {
      classes.push(responsive.lg === 'row' ? 'lg:flex-row' : 'lg:flex-col');
    }
    
    return classes.join(' ');
  };

  return (
    <View
      className={`
        flex
        ${getDirectionClasses()}
        ${alignmentMap[align]}
        ${justifyMap[justify]}
        ${wrap ? 'flex-wrap' : ''}
        gap-${spacing}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </View>
  );
};
