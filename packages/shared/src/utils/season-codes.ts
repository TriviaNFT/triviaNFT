/**
 * Season Code Utilities Module
 * 
 * This module provides utilities for generating and parsing season codes
 * used in Seasonal Ultimate NFT asset names.
 * 
 * Season codes follow the format: {Season}{Number}
 * - WI1 = Winter Season 1
 * - SP1 = Spring Season 1
 * - SU1 = Summer Season 1
 * - FA1 = Fall Season 1
 * - WI2 = Winter Season 2, etc.
 */

import type { SeasonCode } from './nft-naming';
import { getMetricsStore } from './nft-naming-metrics';
import { Logger } from './logger';

// Re-export SeasonCode for convenience
export type { SeasonCode };

// Optional logger instance
let logger: Logger | null = null;

/**
 * Set the logger instance for season code operations
 */
export function setSeasonCodeLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Get the current logger instance or create a default one
 */
function getLogger(): Logger {
  if (!logger) {
    logger = new Logger({ module: 'season-codes' });
  }
  return logger;
}

/**
 * Season types for season codes
 */
export type SeasonType = 'winter' | 'spring' | 'summer' | 'fall';

/**
 * Season information extracted from a season code
 */
export interface SeasonInfo {
  code: SeasonCode;
  name: string;
  seasonNumber: number;
  season: SeasonType;
}

/**
 * Mapping from season names to their 2-letter codes
 */
const SEASON_PREFIX_MAP: Record<SeasonType, string> = {
  winter: 'WI',
  spring: 'SP',
  summer: 'SU',
  fall: 'FA',
};

/**
 * Reverse mapping from 2-letter codes to season names
 */
const PREFIX_SEASON_MAP: Record<string, SeasonType> = {
  WI: 'winter',
  SP: 'spring',
  SU: 'summer',
  FA: 'fall',
};

/**
 * Regular expression for validating season codes
 * Format: 2 uppercase letters + 1 or more digits
 */
const SEASON_CODE_REGEX = /^(WI|SP|SU|FA)(\d+)$/;

/**
 * Generate a season code from season information
 * 
 * @param season - The season type (winter, spring, summer, fall)
 * @param seasonNumber - The season number (1, 2, 3, etc.)
 * @returns The season code (e.g., 'WI1', 'SP2')
 * @throws Error if season is invalid or seasonNumber is not positive
 * 
 * @example
 * getSeasonCode('winter', 1) // returns 'WI1'
 * getSeasonCode('spring', 2) // returns 'SP2'
 */
export function getSeasonCode(season: SeasonType, seasonNumber: number): SeasonCode {
  const metrics = getMetricsStore();
  const input = `${season}-${seasonNumber}`;

  if (!SEASON_PREFIX_MAP[season]) {
    getLogger().logSeasonCodeOperation('generate', input, null, false, { 
      error: 'Invalid season type' 
    });
    metrics.recordSeasonCodeOp(false);
    throw new Error(`Invalid season: ${season}. Must be one of: winter, spring, summer, fall`);
  }

  if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
    getLogger().logSeasonCodeOperation('generate', input, null, false, { 
      error: 'Invalid season number' 
    });
    metrics.recordSeasonCodeOp(false);
    throw new Error(`Invalid season number: ${seasonNumber}. Must be a positive integer`);
  }

  const prefix = SEASON_PREFIX_MAP[season];
  const code = `${prefix}${seasonNumber}`;
  
  getLogger().logSeasonCodeOperation('generate', input, code, true);
  metrics.recordSeasonCodeOp(true);
  
  return code;
}

/**
 * Parse a season code and extract season information
 * 
 * @param code - The season code to parse (e.g., 'WI1', 'SP2')
 * @returns The parsed season information
 * @throws Error if the code format is invalid
 * 
 * @example
 * parseSeasonCode('WI1')
 * // returns: { code: 'WI1', name: 'Winter Season 1', seasonNumber: 1, season: 'winter' }
 * 
 * parseSeasonCode('SP2')
 * // returns: { code: 'SP2', name: 'Spring Season 2', seasonNumber: 2, season: 'spring' }
 */
export function parseSeasonCode(code: SeasonCode): SeasonInfo {
  const metrics = getMetricsStore();
  const match = code.match(SEASON_CODE_REGEX);
  
  if (!match) {
    getLogger().logSeasonCodeOperation('parse', code, null, false, { 
      error: 'Invalid season code format' 
    });
    metrics.recordSeasonCodeOp(false);
    throw new Error(
      `Invalid season code format: ${code}. Expected format: WI1, SP1, SU1, FA1, etc.`
    );
  }

  const [, prefix, numberStr] = match;
  const season = PREFIX_SEASON_MAP[prefix];
  const seasonNumber = parseInt(numberStr, 10);

  // Capitalize first letter for display name
  const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
  const name = `${seasonName} Season ${seasonNumber}`;

  const result = {
    code,
    name,
    seasonNumber,
    season,
  };

  getLogger().logSeasonCodeOperation('parse', code, name, true, { 
    season, 
    seasonNumber 
  });
  metrics.recordSeasonCodeOp(true);

  return result;
}

/**
 * Validate a season code format
 * 
 * @param code - The season code to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * validateSeasonCode('WI1') // returns true
 * validateSeasonCode('INVALID') // returns false
 */
export function validateSeasonCode(code: string): boolean {
  return SEASON_CODE_REGEX.test(code);
}
