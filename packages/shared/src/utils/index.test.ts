import { describe, it, expect } from 'vitest';
import { formatDate, calculateCountdown } from './index';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = formatDate(date);
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('calculateCountdown', () => {
    it('should calculate remaining time in milliseconds', () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      const result = calculateCountdown(futureDate);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it('should return 0 for past dates', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const result = calculateCountdown(pastDate);
      expect(result).toBe(0);
    });
  });
});
