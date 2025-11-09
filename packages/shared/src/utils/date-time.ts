/**
 * Date and time utility functions
 */

/**
 * Format a date to ISO string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Calculate countdown in milliseconds from now to expiration
 */
export const calculateCountdown = (expiresAt: string | Date): number => {
  const now = new Date().getTime();
  const expires = new Date(expiresAt).getTime();
  return Math.max(0, expires - now);
};

/**
 * Calculate countdown in seconds
 */
export const calculateCountdownSeconds = (expiresAt: string | Date): number => {
  return Math.floor(calculateCountdown(expiresAt) / 1000);
};

/**
 * Format countdown to human-readable string (e.g., "5m 30s", "1h 15m")
 */
export const formatCountdown = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  return `${seconds}s`;
};

/**
 * Convert UTC date to Eastern Time (ET)
 */
export const toEasternTime = (date: Date): Date => {
  // ET is UTC-5 (EST) or UTC-4 (EDT)
  // This is a simplified version; for production, use a library like date-fns-tz
  const utcOffset = date.getTimezoneOffset();
  const etOffset = -5 * 60; // EST offset in minutes
  const offsetDiff = etOffset - utcOffset;
  return new Date(date.getTime() + offsetDiff * 60 * 1000);
};

/**
 * Get midnight ET for a given date
 */
export const getMidnightET = (date: Date = new Date()): Date => {
  const et = toEasternTime(date);
  et.setHours(0, 0, 0, 0);
  return et;
};

/**
 * Get next midnight ET from now
 */
export const getNextMidnightET = (): Date => {
  const midnight = getMidnightET();
  const now = new Date();

  if (midnight <= now) {
    // If midnight has passed, get tomorrow's midnight
    midnight.setDate(midnight.getDate() + 1);
  }

  return midnight;
};

/**
 * Calculate time until next midnight ET in milliseconds
 */
export const getTimeUntilMidnightET = (): number => {
  const nextMidnight = getNextMidnightET();
  return nextMidnight.getTime() - new Date().getTime();
};

/**
 * Format time in milliseconds to MM:SS
 */
export const formatTimeMMSS = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Check if a date is expired
 */
export const isExpired = (expiresAt: string | Date): boolean => {
  return new Date(expiresAt).getTime() < new Date().getTime();
};

/**
 * Add minutes to a date
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

/**
 * Add hours to a date
 */
export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * Get date string in YYYY-MM-DD format
 */
export const getDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
