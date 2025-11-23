/**
 * Property-Based Tests for NFT Asset Naming
 * 
 * These tests use fast-check to verify correctness properties
 * across a wide range of inputs.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  buildAssetName,
  parseAssetName,
  validateAssetName,
  generateHexId,
  type CategoryCode,
  type SeasonCode,
  type TierType,
} from './nft-naming';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

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

/**
 * Generator for valid hex IDs (8 lowercase hex characters)
 */
const hexIdArb = fc.array(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
  { minLength: 8, maxLength: 8 }
).map(chars => chars.join(''));

/**
 * Generator for valid season codes
 */
const seasonCodeArb = fc.constantFrom<SeasonCode>(
  'WI1', 'SP1', 'SU1', 'FA1',
  'WI2', 'SP2', 'SU2', 'FA2',
  'WI3', 'SP3', 'SU3', 'FA3'
);

/**
 * Generator for all tier types
 */
const tierTypeArb = fc.constantFrom<TierType>(
  'category',
  'category_ultimate',
  'master_ultimate',
  'seasonal_ultimate'
);

// ============================================================================
// Property 1: Asset name format consistency
// Feature: nft-naming-convention, Property 1: Asset name format consistency
// ============================================================================

describe('Property 1: Asset name format consistency', () => {
  it('should start with TNFT_V1_ and end with 8-char hex ID for all valid inputs', () => {
    fc.assert(
      fc.property(
        tierTypeArb,
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
          // Build params based on tier requirements
          const params: any = { tier, id };
          
          if (tier === 'category' || tier === 'category_ultimate') {
            params.categoryCode = categoryCode;
          }
          
          if (tier === 'seasonal_ultimate') {
            params.seasonCode = seasonCode;
          }

          const assetName = buildAssetName(params);
          
          // Verify format consistency
          const startsCorrectly = assetName.startsWith('TNFT_V1_');
          const endsWithId = assetName.endsWith(id);
          
          return startsCorrectly && endsWithId;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Asset name length constraint
// Feature: nft-naming-convention, Property 2: Asset name length constraint
// ============================================================================

describe('Property 2: Asset name length constraint', () => {
  it('should never exceed 32 bytes for any valid input combination', () => {
    fc.assert(
      fc.property(
        tierTypeArb,
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
          // Build params based on tier requirements
          const params: any = { tier, id };
          
          if (tier === 'category' || tier === 'category_ultimate') {
            params.categoryCode = categoryCode;
          }
          
          if (tier === 'seasonal_ultimate') {
            params.seasonCode = seasonCode;
          }

          const assetName = buildAssetName(params);
          
          return assetName.length <= 32;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 3: Asset name character set
// Feature: nft-naming-convention, Property 3: Asset name character set
// ============================================================================

describe('Property 3: Asset name character set', () => {
  it('should only contain A-Z, 0-9, and underscore characters (with lowercase hex ID)', () => {
    fc.assert(
      fc.property(
        tierTypeArb,
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
          // Build params based on tier requirements
          const params: any = { tier, id };
          
          if (tier === 'category' || tier === 'category_ultimate') {
            params.categoryCode = categoryCode;
          }
          
          if (tier === 'seasonal_ultimate') {
            params.seasonCode = seasonCode;
          }

          const assetName = buildAssetName(params);
          
          // Check that every character is from the valid set (A-Z, 0-9, _, and a-f for hex)
          const validCharsRegex = /^[A-Za-z0-9_]+$/;
          return validCharsRegex.test(assetName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 4: Build-parse round trip
// Feature: nft-naming-convention, Property 4: Build-parse round trip
// ============================================================================

describe('Property 4: Build-parse round trip', () => {
  it('should preserve all components when building then parsing', () => {
    fc.assert(
      fc.property(
        tierTypeArb,
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
          // Build params based on tier requirements
          const params: any = { tier, id };
          
          if (tier === 'category' || tier === 'category_ultimate') {
            params.categoryCode = categoryCode;
          }
          
          if (tier === 'seasonal_ultimate') {
            params.seasonCode = seasonCode;
          }

          const assetName = buildAssetName(params);
          const parsed = parseAssetName(assetName);
          
          if (!parsed) return false;
          
          // Verify all components match
          const prefixMatch = parsed.prefix === 'TNFT';
          const versionMatch = parsed.version === 'V1';
          const idMatch = parsed.id === id;
          
          // Check tier-specific components
          let tierMatch = true;
          if (tier === 'category') {
            tierMatch = parsed.tier === 'REG' && parsed.categoryCode === categoryCode;
          } else if (tier === 'category_ultimate') {
            tierMatch = parsed.tier === 'ULT' && parsed.categoryCode === categoryCode;
          } else if (tier === 'master_ultimate') {
            tierMatch = parsed.tier === 'MAST' && !parsed.categoryCode;
          } else if (tier === 'seasonal_ultimate') {
            tierMatch = parsed.tier === 'SEAS' && parsed.seasonCode === seasonCode;
          }
          
          return prefixMatch && versionMatch && idMatch && tierMatch;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 12: Hex ID format
// Feature: nft-naming-convention, Property 12: Hex ID format
// ============================================================================

describe('Property 12: Hex ID format', () => {
  it('should generate exactly 8 lowercase hexadecimal characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (_) => {
          const hexId = generateHexId();
          
          // Check length
          const correctLength = hexId.length === 8;
          
          // Check format (lowercase hex)
          const hexRegex = /^[0-9a-f]{8}$/;
          const correctFormat = hexRegex.test(hexId);
          
          return correctLength && correctFormat;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 11: Validation rejects invalid formats
// Feature: nft-naming-convention, Property 11: Validation rejects invalid formats
// ============================================================================

describe('Property 11: Validation rejects invalid formats', () => {
  it('should reject strings that do not match the specification', () => {
    // Generator for invalid asset names
    // These should be strings that are neither valid new format nor valid legacy format
    const invalidAssetNameArb = fc.oneof(
      // Too long (exceeds legacy max of 64)
      fc.string({ minLength: 65, maxLength: 100 }),
      // Invalid characters (not alphanumeric or hyphen/underscore)
      fc.string().filter(s => s.length > 0 && /[^A-Za-z0-9_-]/.test(s)),
      // Empty or too short (less than 5 for legacy, less than 4 parts for new)
      fc.string({ maxLength: 4 }),
      // Mixed case with invalid patterns (uppercase letters with hyphens - not valid for either format)
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => 
        /[A-Z]/.test(s) && /-/.test(s) && !s.startsWith('TNFT_V1_')
      )
    );

    fc.assert(
      fc.property(
        invalidAssetNameArb,
        (invalidName) => {
          const isValid = validateAssetName(invalidName);
          return !isValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept all properly formatted asset names', () => {
    fc.assert(
      fc.property(
        tierTypeArb,
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
          // Build params based on tier requirements
          const params: any = { tier, id };
          
          if (tier === 'category' || tier === 'category_ultimate') {
            params.categoryCode = categoryCode;
          }
          
          if (tier === 'seasonal_ultimate') {
            params.seasonCode = seasonCode;
          }

          const assetName = buildAssetName(params);
          const isValid = validateAssetName(assetName);
          
          return isValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 6: Tier 1 format correctness
// Feature: nft-naming-convention, Property 6: Tier 1 format correctness
// Validates: Requirements 3.1
// ============================================================================

describe('Property 6: Tier 1 format correctness', () => {
  it('should match pattern TNFT_V1_{CAT}_REG_{id} for all Category NFTs', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category',
            categoryCode,
            id,
          });
          
          // Expected pattern: TNFT_V1_{CAT}_REG_{id}
          const expectedPattern = `TNFT_V1_${categoryCode}_REG_${id}`;
          
          return assetName === expectedPattern;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct structure when parsed', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category',
            categoryCode,
            id,
          });
          
          const parsed = parseAssetName(assetName);
          
          if (!parsed) return false;
          
          // Verify all components
          return (
            parsed.prefix === 'TNFT' &&
            parsed.version === 'V1' &&
            parsed.tier === 'REG' &&
            parsed.categoryCode === categoryCode &&
            parsed.id === id &&
            parsed.seasonCode === undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be valid according to validateAssetName', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category',
            categoryCode,
            id,
          });
          
          return validateAssetName(assetName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 7: Tier 2 format correctness
// Feature: nft-naming-convention, Property 7: Tier 2 format correctness
// Validates: Requirements 3.2
// ============================================================================

describe('Property 7: Tier 2 format correctness', () => {
  it('should match pattern TNFT_V1_{CAT}_ULT_{id} for all Category Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category_ultimate',
            categoryCode,
            id,
          });
          
          // Expected pattern: TNFT_V1_{CAT}_ULT_{id}
          const expectedPattern = `TNFT_V1_${categoryCode}_ULT_${id}`;
          
          return assetName === expectedPattern;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct structure when parsed', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category_ultimate',
            categoryCode,
            id,
          });
          
          const parsed = parseAssetName(assetName);
          
          if (!parsed) return false;
          
          // Verify all components
          return (
            parsed.prefix === 'TNFT' &&
            parsed.version === 'V1' &&
            parsed.tier === 'ULT' &&
            parsed.categoryCode === categoryCode &&
            parsed.id === id &&
            parsed.seasonCode === undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be valid according to validateAssetName', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category_ultimate',
            categoryCode,
            id,
          });
          
          return validateAssetName(assetName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 8: Tier 3 format correctness
// Feature: nft-naming-convention, Property 8: Tier 3 format correctness
// Validates: Requirements 3.3
// ============================================================================

describe('Property 8: Tier 3 format correctness', () => {
  it('should match pattern TNFT_V1_MAST_{id} for all Master Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        hexIdArb,
        (id) => {
          const assetName = buildAssetName({
            tier: 'master_ultimate',
            id,
          });
          
          // Expected pattern: TNFT_V1_MAST_{id}
          const expectedPattern = `TNFT_V1_MAST_${id}`;
          
          return assetName === expectedPattern;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct structure when parsed', () => {
    fc.assert(
      fc.property(
        hexIdArb,
        (id) => {
          const assetName = buildAssetName({
            tier: 'master_ultimate',
            id,
          });
          
          const parsed = parseAssetName(assetName);
          
          if (!parsed) return false;
          
          // Verify all components
          return (
            parsed.prefix === 'TNFT' &&
            parsed.version === 'V1' &&
            parsed.tier === 'MAST' &&
            parsed.categoryCode === undefined &&
            parsed.id === id &&
            parsed.seasonCode === undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be valid according to validateAssetName', () => {
    fc.assert(
      fc.property(
        hexIdArb,
        (id) => {
          const assetName = buildAssetName({
            tier: 'master_ultimate',
            id,
          });
          
          return validateAssetName(assetName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not include category code in Master Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        hexIdArb,
        (id) => {
          const assetName = buildAssetName({
            tier: 'master_ultimate',
            id,
          });
          
          // Master Ultimate should not contain any category codes
          const categoryCodesPattern = /(ARTS|ENT|GEO|HIST|MYTH|NAT|SCI|SPORT|TECH|WEIRD)/;
          const containsCategoryCode = categoryCodesPattern.test(assetName);
          
          return !containsCategoryCode;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 9: Tier 4 format correctness
// Feature: nft-naming-convention, Property 9: Tier 4 format correctness
// Validates: Requirements 3.4
// ============================================================================

describe('Property 9: Tier 4 format correctness', () => {
  it('should match pattern TNFT_V1_SEAS_{SeasonCode}_ULT_{id} for all Seasonal Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        hexIdArb,
        (seasonCode, id) => {
          const assetName = buildAssetName({
            tier: 'seasonal_ultimate',
            seasonCode,
            id,
          });
          
          // Expected pattern: TNFT_V1_SEAS_{SeasonCode}_ULT_{id}
          const expectedPattern = `TNFT_V1_SEAS_${seasonCode}_ULT_${id}`;
          
          return assetName === expectedPattern;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct structure when parsed', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        hexIdArb,
        (seasonCode, id) => {
          const assetName = buildAssetName({
            tier: 'seasonal_ultimate',
            seasonCode,
            id,
          });
          
          const parsed = parseAssetName(assetName);
          
          if (!parsed) return false;
          
          // Verify all components
          return (
            parsed.prefix === 'TNFT' &&
            parsed.version === 'V1' &&
            parsed.tier === 'SEAS' &&
            parsed.categoryCode === undefined &&
            parsed.seasonCode === seasonCode &&
            parsed.id === id
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be valid according to validateAssetName', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        hexIdArb,
        (seasonCode, id) => {
          const assetName = buildAssetName({
            tier: 'seasonal_ultimate',
            seasonCode,
            id,
          });
          
          return validateAssetName(assetName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include season code in Seasonal Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        hexIdArb,
        (seasonCode, id) => {
          const assetName = buildAssetName({
            tier: 'seasonal_ultimate',
            seasonCode,
            id,
          });
          
          // Seasonal Ultimate should contain the season code
          const containsSeasonCode = assetName.includes(seasonCode);
          
          return containsSeasonCode;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not include category code in Seasonal Ultimate NFTs', () => {
    fc.assert(
      fc.property(
        seasonCodeArb,
        hexIdArb,
        (seasonCode, id) => {
          const assetName = buildAssetName({
            tier: 'seasonal_ultimate',
            seasonCode,
            id,
          });
          
          // Seasonal Ultimate should not contain any category codes
          const categoryCodesPattern = /(ARTS|ENT|GEO|HIST|MYTH|NAT|SCI|SPORT|TECH|WEIRD)/;
          const containsCategoryCode = categoryCodesPattern.test(assetName);
          
          return !containsCategoryCode;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Legacy Format Support Tests
// ============================================================================

describe('Legacy Format Support', () => {
  describe('parseLegacyFormat', () => {
    it('should parse valid legacy format names', () => {
      const legacyNames = [
        'quantum-explorer',
        'dna-helix',
        'ancient-scroll',
        'mountain-peak',
        'champion-trophy',
        'masterpiece-canvas',
        'blockbuster-star',
        'digital-pioneer',
        'cosmic-oddity',
        'zeus-thunder',
        'forest-spirit',
      ];

      legacyNames.forEach(name => {
        const parsed = parseAssetName(name);
        if (!parsed) {
          throw new Error(`Failed to parse legacy name: ${name}`);
        }
        
        // Legacy format should return basic structure
        if (parsed.prefix !== 'TNFT') throw new Error('Invalid prefix');
        if (parsed.version !== 'V1') throw new Error('Invalid version');
        if (parsed.tier !== 'REG') throw new Error('Invalid tier');
        if (parsed.id !== name) throw new Error('Invalid id');
      });
    });

    it('should reject invalid legacy format names', () => {
      const invalidNames = [
        'INVALID_NAME', // uppercase with underscores (looks like new format)
        'name with spaces',
        'name@with#special',
        'a'.repeat(65), // too long
        '',
        'Name-With-Caps',
      ];

      invalidNames.forEach(name => {
        const parsed = parseAssetName(name);
        if (parsed !== null) {
          throw new Error(`Should not parse invalid name: ${name}`);
        }
      });
    });

    it('should validate legacy format names', () => {
      const legacyNames = [
        'quantum-explorer',
        'dna-helix',
        'ancient-scroll',
      ];

      legacyNames.forEach(name => {
        const isValid = validateAssetName(name);
        if (!isValid) {
          throw new Error(`Legacy name should be valid: ${name}`);
        }
      });
    });
  });

  describe('parseAssetName with fallback', () => {
    it('should try new format first, then legacy', () => {
      // New format should be parsed as new format
      const newFormat = 'TNFT_V1_SCI_REG_12b3de7d';
      const parsedNew = parseAssetName(newFormat);
      
      if (!parsedNew) throw new Error('Failed to parse new format');
      if (parsedNew.categoryCode !== 'SCI') throw new Error('Should parse as new format');
      if (parsedNew.id !== '12b3de7d') throw new Error('Should extract hex ID');

      // Legacy format should be parsed as legacy
      const legacyFormat = 'quantum-explorer';
      const parsedLegacy = parseAssetName(legacyFormat);
      
      if (!parsedLegacy) throw new Error('Failed to parse legacy format');
      if (parsedLegacy.categoryCode !== undefined) throw new Error('Legacy should not have category code');
      if (parsedLegacy.id !== legacyFormat) throw new Error('Legacy ID should be full name');
    });

    it('should handle mixed case scenarios', () => {
      // Test various edge cases
      const testCases = [
        { name: 'TNFT_V1_MAST_abcd1234', shouldParse: true, isLegacy: false },
        { name: 'simple-name', shouldParse: true, isLegacy: true },
        { name: 'name-with-numbers-123', shouldParse: true, isLegacy: true },
        { name: 'TNFT_INVALID', shouldParse: false, isLegacy: false },
      ];

      testCases.forEach(({ name, shouldParse, isLegacy }) => {
        const parsed = parseAssetName(name);
        
        if (shouldParse && !parsed) {
          throw new Error(`Should parse: ${name}`);
        }
        
        if (!shouldParse && parsed) {
          throw new Error(`Should not parse: ${name}`);
        }
        
        if (parsed && isLegacy) {
          if (parsed.id !== name) {
            throw new Error(`Legacy format should use full name as ID: ${name}`);
          }
        }
      });
    });
  });

  describe('Property: Legacy format backward compatibility', () => {
    it('should parse any valid kebab-case name as legacy format', () => {
      // Generator for valid legacy names
      const legacyNameArb = fc.array(
        fc.constantFrom(
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
          'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'
        ),
        { minLength: 5, maxLength: 40 }
      ).map(chars => {
        // Ensure it doesn't start or end with hyphen
        let name = chars.join('');
        name = name.replace(/^-+|-+$/g, '');
        // Ensure it doesn't look like new format
        if (name.startsWith('tnft-v1')) {
          name = 'legacy-' + name;
        }
        return name;
      }).filter(name => 
        name.length >= 5 && 
        name.length <= 64 && 
        !name.startsWith('tnft_v1') &&
        /^[a-z0-9-]+$/.test(name)
      );

      fc.assert(
        fc.property(
          legacyNameArb,
          (legacyName) => {
            const parsed = parseAssetName(legacyName);
            
            if (!parsed) return false;
            
            // Should parse as legacy format
            const isLegacyFormat = (
              parsed.prefix === 'TNFT' &&
              parsed.version === 'V1' &&
              parsed.tier === 'REG' &&
              parsed.id === legacyName &&
              parsed.categoryCode === undefined &&
              parsed.seasonCode === undefined
            );
            
            return isLegacyFormat;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate any valid legacy format name', () => {
      const legacyNameArb = fc.array(
        fc.constantFrom(
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
          'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'
        ),
        { minLength: 5, maxLength: 40 }
      ).map(chars => {
        let name = chars.join('');
        name = name.replace(/^-+|-+$/g, '');
        if (name.startsWith('tnft-v1')) {
          name = 'legacy-' + name;
        }
        return name;
      }).filter(name => 
        name.length >= 5 && 
        name.length <= 64 && 
        !name.startsWith('tnft_v1') &&
        /^[a-z0-9-]+$/.test(name)
      );

      fc.assert(
        fc.property(
          legacyNameArb,
          (legacyName) => {
            return validateAssetName(legacyName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
