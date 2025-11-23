import React from 'react';
import { View, Pressable } from 'react-native';
import type { ViewProps, PressableProps } from 'react-native';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: CardVariant;
  pressable?: boolean;
  onPress?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-background-secondary shadow-lg',
  elevated: 'bg-background-secondary shadow-glow',
  outlined: 'bg-transparent border-2 border-background-tertiary',
  ghost: 'bg-background-tertiary/50',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  pressable = false,
  onPress,
  className,
  ...props
}) => {
  const baseStyles = `rounded-xl p-4 ${variantStyles[variant]}`;

  if (pressable && onPress) {
    return (
      <Pressable
        className={`${baseStyles} active:opacity-80 transition-opacity ${className || ''}`}
        onPress={onPress}
        accessibilityRole="button"
        {...(props as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${baseStyles} ${className || ''}`} {...props}>
      {children}
    </View>
  );
};
