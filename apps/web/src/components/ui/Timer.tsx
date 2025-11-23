import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'w-12 h-12',
    text: 'text-lg',
    stroke: 2,
  },
  md: {
    container: 'w-16 h-16',
    text: 'text-2xl',
    stroke: 3,
  },
  lg: {
    container: 'w-24 h-24',
    text: 'text-4xl',
    stroke: 4,
  },
};

export const Timer: React.FC<TimerProps> = ({
  seconds,
  onComplete,
  size = 'md',
  showProgress = true,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Just display the seconds value passed from parent (controlled component)
  const timeLeft = Math.max(0, seconds);
  const isWarning = timeLeft <= 3 && timeLeft > 0;

  // Fixed total duration for progress calculation (assuming 10 second questions)
  const totalSeconds = 10;
  const progress = (timeLeft / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference;

  const timerColor = isWarning ? 'text-error-500' : 'text-primary-500';
  const progressColor = isWarning ? '#ef4444' : '#6d4ee3';

  return (
    <View className={`${sizeStyles[size].container} relative items-center justify-center ${className || ''}`}>
      {showProgress && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="absolute"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#252541"
            strokeWidth={sizeStyles[size].stroke}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={progressColor}
            strokeWidth={sizeStyles[size].stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
      )}
      <Text
        className={`${sizeStyles[size].text} ${timerColor} font-bold ${
          isWarning && !prefersReducedMotion ? 'animate-pulse' : ''
        }`}
      >
        {timeLeft}
      </Text>
    </View>
  );
};
