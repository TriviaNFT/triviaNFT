import React from 'react';
import { Pressable, Text, ActivityIndicator, View, Platform } from 'react-native';
import type { PressableProps } from 'react-native';
import { useFocusRing } from '../../hooks/useFocusRing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 active:bg-primary-700 active:scale-[0.98]',
  secondary: 'bg-background-tertiary active:bg-background-secondary active:scale-[0.98]',
  outline: 'bg-transparent border-2 border-primary-600 active:bg-primary-600/10 active:scale-[0.98]',
  ghost: 'bg-transparent active:bg-background-tertiary active:scale-[0.98]',
  danger: 'bg-error-600 active:bg-error-700 active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-3 py-2 rounded-lg min-h-[44px]', // Minimum 44px touch target
    text: 'text-sm',
  },
  md: {
    container: 'px-4 py-3 rounded-lg min-h-[44px]', // Minimum 44px touch target
    text: 'text-base',
  },
  lg: {
    container: 'px-6 py-4 rounded-xl min-h-[48px]', // Larger touch target for emphasis
    text: 'text-lg',
  },
};

const textColorStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text-primary',
  outline: 'text-primary-600',
  ghost: 'text-text-primary',
  danger: 'text-white',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const { isFocused, onFocus, onBlur, getFocusRingStyle } = useFocusRing();

  // Determine focus ring color based on variant
  const focusColor = variant === 'danger' ? '#DC2626' : '#8A5CF6';

  return (
    <Pressable
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size].container}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        flex-row items-center justify-center
        transition-all duration-200
        ${className || ''}
      `}
      style={getFocusRingStyle(focusColor)}
      disabled={isDisabled}
      onFocus={onFocus}
      onBlur={onBlur}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#6d4ee3' : '#ffffff'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className={`
              ${sizeStyles[size].text}
              ${textColorStyles[variant]}
              font-semibold
            `}
          >
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
};
