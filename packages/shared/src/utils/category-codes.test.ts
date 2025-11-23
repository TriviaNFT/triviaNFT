/**
 * Property-Based Tests for Category Code Mapping
 * 
 * These tests use fast-check to verify correctness properties
 * across a wide range of inputs.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  getCategoryCode,
  getCategorySlug,
  type CategorySlug,
} from './category-codes';
import type { CategoryCode } from './nft-naming';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

/**
 * Generator for valid category slugs
 */
const categorySlugArb = fc.constantFrom<CategorySlug>(
  'arts',
  'entertainment',
  'geography',
  'history',
  'mythology',
  'nature',
  'science',
  'sports',
  'technology',
  'weird-wonderful'
);

/**
 * Generator for valid category codes
 */
const categoryCodeArb = fc.constantFrom<CategoryCode>(
  'ARTS',
  'ENT',
  'GEO',
  'HIST',
  'MYTH',
  'NAT',
  'SCI',
  'SPORT',
  'TECH',
  'WEIRD'
);

// ============================================================================
// Property 5: Category code bidirectional mapping
// Feature: nft-naming-convention, Property 5: Category code bidirectional mapping
// ============================================================================

describe('Property 5: Category code bidirectional mapping', () => {
  it('should preserve slug when converting slug -> code -> slug', () => {
    fc.assert(
      fc.property(
        categorySlugArb,
        (slug) => {
          const code = getCategoryCode(slug);
          const backToSlug = getCategorySlug(code);
          return backToSlug === slug;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve code when converting code -> slug -> code', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        (code) => {
          const slug = getCategorySlug(code);
          const backToCode = getCategoryCode(slug);
          return backToCode === code;
        }
      ),
      { numRuns: 100 }
    );
  });
});
