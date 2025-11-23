/**
 * Category Code Mapping Module
 * 
 * This module provides mapping between category slugs and their short codes
 * used in NFT asset names. Each category has a unique 3-5 character code.
 */

import type { CategoryCode } from './nft-naming';
import { getMetricsStore } from './nft-naming-metrics';
import { Logger } from './logger';

// Re-export CategoryCode for convenience
export type { CategoryCode };

// Optional logger instance
let logger: Logger | null = null;

/**
 * Set the logger instance for category code operations
 */
export function setCategoryCodeLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Get the current logger instance or create a default one
 */
function getLogger(): Logger {
  if (!logger) {
    logger = new Logger({ module: 'category-codes' });
  }
  return logger;
}

/**
 * Category slugs used in the database and URLs
 */
export type CategorySlug = 
  | 'arts'
  | 'entertainment'
  | 'geography'
  | 'history'
  | 'mythology'
  | 'nature'
  | 'science'
  | 'sports'
  | 'technology'
  | 'weird-wonderful';

/**
 * Mapping from category slugs to category codes
 */
export const CATEGORY_CODE_MAP: Record<CategorySlug, CategoryCode> = {
  'arts': 'ARTS',
  'entertainment': 'ENT',
  'geography': 'GEO',
  'history': 'HIST',
  'mythology': 'MYTH',
  'nature': 'NAT',
  'science': 'SCI',
  'sports': 'SPORT',
  'technology': 'TECH',
  'weird-wonderful': 'WEIRD',
};

/**
 * Reverse mapping from category codes to category slugs
 */
export const CATEGORY_SLUG_MAP: Record<CategoryCode, CategorySlug> = {
  'ARTS': 'arts',
  'ENT': 'entertainment',
  'GEO': 'geography',
  'HIST': 'history',
  'MYTH': 'mythology',
  'NAT': 'nature',
  'SCI': 'science',
  'SPORT': 'sports',
  'TECH': 'technology',
  'WEIRD': 'weird-wonderful',
};

/**
 * Convert a category slug to its corresponding category code
 * 
 * @param slug - The category slug (e.g., 'science')
 * @returns The category code (e.g., 'SCI')
 * @throws Error if the slug is not recognized
 * 
 * @example
 * getCategoryCode('science') // returns 'SCI'
 * getCategoryCode('arts') // returns 'ARTS'
 */
export function getCategoryCode(slug: CategorySlug): CategoryCode {
  const metrics = getMetricsStore();
  const code = CATEGORY_CODE_MAP[slug];
  
  if (!code) {
    getLogger().logCategoryCodeMapping('slug_to_code', slug, null, false, { 
      error: 'Unknown category slug' 
    });
    metrics.recordCategoryMapping(false);
    throw new Error(`Unknown category slug: ${slug}`);
  }
  
  getLogger().logCategoryCodeMapping('slug_to_code', slug, code, true);
  metrics.recordCategoryMapping(true);
  return code;
}

/**
 * Convert a category code to its corresponding category slug
 * 
 * @param code - The category code (e.g., 'SCI')
 * @returns The category slug (e.g., 'science')
 * @throws Error if the code is not recognized
 * 
 * @example
 * getCategorySlug('SCI') // returns 'science'
 * getCategorySlug('ARTS') // returns 'arts'
 */
export function getCategorySlug(code: CategoryCode): CategorySlug {
  const metrics = getMetricsStore();
  const slug = CATEGORY_SLUG_MAP[code];
  
  if (!slug) {
    getLogger().logCategoryCodeMapping('code_to_slug', code, null, false, { 
      error: 'Unknown category code' 
    });
    metrics.recordCategoryMapping(false);
    throw new Error(`Unknown category code: ${code}`);
  }
  
  getLogger().logCategoryCodeMapping('code_to_slug', code, slug, true);
  metrics.recordCategoryMapping(true);
  return slug;
}
