import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSessionTimerOptions {
  initialSeconds: number;
  onTimeout: () => void;
  autoStart?: boolean;
}

export const useSessionTimer = ({
  initialSeconds,
  onTimeout,
  autoStart = true,
}: UseSessionTimerOptions) => {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCalledTimeoutRef = useRef(false);

  // Reset timer
  const reset = useCallback((seconds?: number) => {
    const newSeconds = seconds ?? initialSeconds;
    setTimeRemaining(newSeconds);
    hasCalledTimeoutRef.current = false;
    if (autoStart) {
      setIsRunning(true);
      setIsPaused(false);
    }
  }, [initialSeconds, autoStart]);

  // Start timer
  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  // Pause timer
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume timer
  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Stop timer
  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timeRemaining <= 0) {
      if (!hasCalledTimeoutRef.current) {
        hasCalledTimeoutRef.current = true;
        onTimeout();
      }
      stop();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (!hasCalledTimeoutRef.current) {
            hasCalledTimeoutRef.current = true;
            onTimeout();
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, timeRemaining, onTimeout, stop]);

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
