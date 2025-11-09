import React from 'react';
import { View, Text } from 'react-native';
import type { ViewProps } from 'react-native';

export interface ProgressBarProps extends ViewProps {
  value: number;
  max: number;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantStyles = {
  primary: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  showLabel = false,
  label,
  size = 'md',
  variant = 'primary',
  animated = true,
  className,
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayLabel = label || `${value}/${max}`;

  return (
    <View className={`w-full ${className || ''}`} {...props}>
      {showLabel && (
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-text-secondary text-sm">{displayLabel}</Text>
          <Text className="text-text-primary text-sm font-semibold">{percentage.toFixed(0)}%</Text>
        </View>
      )}
      <View className={`w-full bg-background-tertiary rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <View
          className={`${sizeStyles[size]} ${variantStyles[variant]} rounded-full ${
            animated ? 'transition-all duration-300' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
};
