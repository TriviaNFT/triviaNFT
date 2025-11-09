import { useState, useEffect, useRef } from 'react';

export interface CountdownResult {
  timeRemaining: number;
  isExpired: boolean;
  formatted: {
    hours: number;
    minutes: number;
    seconds: number;
    display: string;
  };
}

export const useCountdown = (targetDate: string | Date): CountdownResult => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      return Math.max(0, diff);
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [targetDate]);

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  const display =
    hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

  return {
    timeRemaining,
    isExpired: timeRemaining === 0,
    formatted: {
      hours,
      minutes,
      seconds,
      display,
    },
  };
};
