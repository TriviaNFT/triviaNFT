import React from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps } from 'react-native';

export interface TouchableCardProps extends PressableProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  disabled?: boolean;
}

const variantStyles = {
  default: 'bg-background-secondary',
  elevated: 'bg-background-secondary shadow-lg',
  outlined: 'bg-transparent border-2 border-background-tertiary',
};

/**
 * Touchable card component with proper touch feedback and minimum touch target size.
 * Ensures 44x44px minimum touch target for accessibility.
 */
export const TouchableCard: React.FC<TouchableCardProps> = ({
  children,
  variant = 'default',
  disabled = false,
  className,
  ...props
}) => {
  return (
    <Pressable
      className={`
        ${variantStyles[variant]}
        rounded-xl
        p-4
        min-h-[44px]
        ${disabled ? 'opacity-50' : 'active:opacity-80 active:scale-[0.98]'}
        transition-all duration-150
        ${className || ''}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
};
