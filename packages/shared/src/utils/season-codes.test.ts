/**
 * Property-Based Tests for Season Code Utilities
 * 
 * These tests use fast-check to verify correctness properties
 * across a wide range of inputs.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  getSeasonCode,
  parseSeasonCode,
  validateSeasonCode,
  type SeasonType,
} from './season-codes';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

/**
 * Generator for valid season types
 */
const seasonArb = fc.constantFrom<SeasonType>(
  'winter',
  'spring',
  'summer',
  'fall'
);

/**
 * Generator for valid season numbers (1-100)
 * Using a reasonable range for testing
 */
const seasonNumberArb = fc.integer({ min: 1, max: 100 });

/**
 * Generator for valid season codes
 * Generates codes like WI1, SP2, SU3, FA4, etc.
 */
const seasonCodeArb = fc.tuple(seasonArb, seasonNumberArb).map(([season, num]) => {
  const prefixes: Record<SeasonType, string> = {
    winter: 'WI',
    spring: 'SP',
    summer: 'SU',
    fall: 'FA',
  };
  return `${prefixes[season]}${num}`;
});

// ============================================================================
// Property 10: Season code round trip
// Feature: nft-naming-convention, Property 10: Season code round trip
// ============================================================================

describe('Property 10: Season code round trip', () => {
  it('should preserve season information when converting season -> code -> season info', () => {
    fc.assert(
      fc.property(
        seasonArb,
        seasonNumberArb,
        (season, seasonNumber) => {
          // Generate code from season and number
          const code = getSeasonCode(season, seasonNumber);
          
          // Parse the code back
          const parsed = parseSeasonCode(code);
          
          // Verify all information is preserved
          return (
            parsed.season === season &&
            parsed.seasonNumber === seasonNumber &&
            parsed.code === code
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve code when parsing and regenerating', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        (code) => {
          // Parse the code
          const parsed = parseSeasonCode(code);
          
          // Regenerate code from parsed info
          const regenerated = getSeasonCode(parsed.season, parsed.seasonNumber);
          
          // Should match original code
          return regenerated === code;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate all generated season codes', () => {
    fc.assert(
      fc.property(
        seasonArb,
        seasonNumberArb,
        (season, seasonNumber) => {
          const code = getSeasonCode(season, seasonNumber);
          return validateSeasonCode(code);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate correct season name format', () => {
    fc.assert(
      fc.property(
        seasonArb,
        seasonNumberArb,
        (season, seasonNumber) => {
          const code = getSeasonCode(season, seasonNumber);
          const parsed = parseSeasonCode(code);
          
          // Name should be capitalized season + " Season " + number
          const expectedName = `${season.charAt(0).toUpperCase()}${season.slice(1)} Season ${seasonNumber}`;
          return parsed.name === expectedName;
        }
      ),
      { numRuns: 100 }
    );
  });
});
