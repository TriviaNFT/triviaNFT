import React from 'react';
import { View, Text } from 'react-native';
import type { ViewProps } from 'react-native';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends ViewProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: {
    bg: 'bg-primary-500/20 border border-primary-500/60',
    text: 'text-primary-300 font-semibold',
  },
  secondary: {
    bg: 'bg-background-tertiary border border-text-secondary/30',
    text: 'text-text-secondary font-medium',
  },
  success: {
    bg: 'bg-success-500/20 border border-success-500/50',
    text: 'text-success-400 font-semibold',
  },
  warning: {
    bg: 'bg-warning-500/20 border border-warning-500/50',
    text: 'text-warning-400 font-semibold',
  },
  error: {
    bg: 'bg-error-500/20 border border-error-500/50',
    text: 'text-error-400 font-semibold',
  },
  info: {
    bg: 'bg-primary-600/10 border border-primary-600/20',
    text: 'text-primary-300',
  },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: {
    container: 'px-2 py-1 rounded',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 rounded-md',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 rounded-lg',
    text: 'text-base',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  ...props
}) => {
  return (
    <View
      className={`
        ${variantStyles[variant].bg}
        ${sizeStyles[size].container}
        flex-row items-center
        ${className || ''}
      `}
      {...props}
    >
      {icon && <View className="mr-1">{icon}</View>}
      <Text
        className={`
          ${variantStyles[variant].text}
          ${sizeStyles[size].text}
          font-medium
        `}
      >
        {children}
      </Text>
    </View>
  );
};
