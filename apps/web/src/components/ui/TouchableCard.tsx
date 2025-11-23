import React from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps } from 'react-native';
import { useFocusRing } from '../../hooks/useFocusRing';

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
 * Includes visible focus indicators for keyboard navigation.
 */
export const TouchableCard: React.FC<TouchableCardProps> = ({
  children,
  variant = 'default',
  disabled = false,
  className,
  ...props
}) => {
  const { isFocused, onFocus, onBlur, getFocusRingStyle } = useFocusRing();

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
      style={getFocusRingStyle()}
      disabled={disabled}
      onFocus={onFocus}
      onBlur={onBlur}
      accessibilityRole="button"
      {...props}
    >
      {children}
    </Pressable>
  );
};
