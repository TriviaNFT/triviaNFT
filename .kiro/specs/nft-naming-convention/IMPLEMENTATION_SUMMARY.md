# NFT Naming Convention - Implementation Summary

## Overview

This spec defines a new standardized naming convention for TriviaNFT's on-chain Cardano asset names. The implementation is complete and ready for execution.

## What Was Created

### 1. Requirements Document
**Location:** `.kiro/specs/nft-naming-convention/requirements.md`

Defines 9 high-level requirements with detailed acceptance criteria covering:
- Asset name format and structure
- Category code mapping (10 categories)
- Tier code mapping (4 tiers)
- Season code format
- Display name storage
- Helper functions
- Validation rules
- Database schema updates
- Documentation updates

### 2. Design Document
**Location:** `.kiro/specs/nft-naming-convention/design.md`

Comprehensive design including:
- Architecture and component responsibilities
- TypeScript interfaces and function signatures
- Database schema updates with SQL
- CIP-25 metadata format examples
- 12 correctness properties for property-based testing
- Error handling strategy
- Testing strategy (unit, property-based, integration)
- Implementation phases (6 weeks)
- Migration strategy
- Performance and security considerations

### 3. Task List
**Location:** `.kiro/specs/nft-naming-convention/tasks.md`

15 implementation tasks with all tests marked as required:
- Core naming utility module (6 property tests)
- Category code mapping (1 property test)
- Season code utilities (1 property test)
- Error handling classes
- Database migration (1 integration test)
- Minting service integration (2 tests)
- Forging service integration (6 tests across 3 forge types)
- Documentation updates
- Backward compatibility
- Monitoring and logging

### 4. Updated Guide Section
**Location:** `.kiro/specs/nft-naming-convention/UPDATED_GUIDE_SECTION.md`

Complete replacement section for COMPLETE_NFT_SYSTEM_GUIDE.md including:
- Overview of naming convention
- Category code mapping table
- Tier code mapping table
- Season code format table
- All 4 asset name patterns with examples
- Display name vs asset name explanation
- Database schema with new fields
- CIP-25 metadata examples for all tiers
- Minting and forging transaction examples
- Helper function documentation
- File storage paths

## Asset Name Patterns

### The Four Patterns

1. **Tier 1 - Category NFTs (Regular)**
   ```
   TNFT_V1_{CAT}_REG_{id}
   
   Examples:
   TNFT_V1_SCI_REG_12b3de7d
   TNFT_V1_ARTS_REG_9c47ab21
   TNFT_V1_WEIRD_REG_5b92f3d1
   ```

2. **Tier 2 - Category Ultimate NFTs**
   ```
   TNFT_V1_{CAT}_ULT_{id}
   
   Examples:
   TNFT_V1_SCI_ULT_46fbf442
   TNFT_V1_HIST_ULT_85d66984
   ```

3. **Tier 3 - Master Ultimate NFT**
   ```
   TNFT_V1_MAST_{id}
   
   Examples:
   TNFT_V1_MAST_41871703
   ```

4. **Tier 4 - Seasonal Ultimate NFTs**
   ```
   TNFT_V1_SEAS_{SeasonCode}_ULT_{id}
   
   Examples:
   TNFT_V1_SEAS_WI1_ULT_0559c272
   TNFT_V1_SEAS_SU1_ULT_94f77f36
   ```

## Category Codes

| Slug              | Code    | Name                  |
|-------------------|---------|-----------------------|
| arts              | ARTS    | Arts & Literature     |
| entertainment     | ENT     | Entertainment         |
| geography         | GEO     | Geography             |
| history           | HIST    | History               |
| mythology         | MYTH    | Mythology             |
| nature            | NAT     | Nature                |
| science           | SCI     | Science               |
| sports            | SPORT   | Sports                |
| technology        | TECH    | Technology            |
| weird-wonderful   | WEIRD   | Weird & Wonderful     |

## Helper API

### Recommended Implementation

```typescript
// src/utils/nft-naming.ts

export type TierType = 
  | 'category' 
  | 'category_ultimate' 
  | 'master_ultimate' 
  | 'seasonal_ultimate';

export type CategoryCode = 
  | 'ARTS' | 'ENT' | 'GEO' | 'HIST' | 'MYTH' 
  | 'NAT' | 'SCI' | 'SPORT' | 'TECH' | 'WEIRD';

export type SeasonCode = string; // WI1, SP1, SU1, FA1, etc.

export interface BuildAssetNameParams {
  tier: TierType;
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string; // 8-character hex
}

export interface AssetNameComponents {
  prefix: 'TNFT';
  version: 'V1';
  tier: 'REG' | 'ULT' | 'MAST' | 'SEAS';
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string;
}

/**
 * Build an asset name from components
 * @throws AssetNameValidationError if parameters are invalid
 */
export function buildAssetName(params: BuildAssetNameParams): string;

/**
 * Parse an asset name into components
 * @returns Components object or null if invalid
 */
export function parseAssetName(assetName: string): AssetNameComponents | null;

/**
 * Validate an asset name format
 * @returns true if valid, false otherwise
 */
export function validateAssetName(assetName: string): boolean;

/**
 * Generate a unique 8-character hex ID
 * @returns Lowercase hex string
 */
export function generateHexId(): string;
```

### Category Code Utilities

```typescript
// src/utils/category-codes.ts

export type CategorySlug = 
  | 'arts' | 'entertainment' | 'geography' | 'history' | 'mythology'
  | 'nature' | 'science' | 'sports' | 'technology' | 'weird-wonderful';

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
  'weird-wonderful': 'WEIRD'
};

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
  'WEIRD': 'weird-wonderful'
};

export function getCategoryCode(slug: CategorySlug): CategoryCode;
export function getCategorySlug(code: CategoryCode): CategorySlug;
```

### Season Code Utilities

```typescript
// src/utils/season-codes.ts

export interface SeasonInfo {
  code: SeasonCode;
  name: string;
  year: number;
  season: 'winter' | 'spring' | 'summer' | 'fall';
}

/**
 * Get season code from season ID
 * @param seasonId Database season ID (e.g., "winter-s1")
 * @returns Season code (e.g., "WI1")
 */
export function getSeasonCode(seasonId: string): SeasonCode;

/**
 * Parse season code into structured information
 * @param code Season code (e.g., "WI1")
 * @returns Season information object
 */
export function parseSeasonCode(code: SeasonCode): SeasonInfo;
```

## Database Changes

### Required Migrations

```sql
-- Add display_name to nft_catalog
ALTER TABLE nft_catalog 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);

UPDATE nft_catalog 
SET display_name = name 
WHERE display_name IS NULL;

-- Add category_code to categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_code VARCHAR(10);

UPDATE categories SET category_code = 'ARTS' WHERE slug = 'arts';
UPDATE categories SET category_code = 'ENT' WHERE slug = 'entertainment';
UPDATE categories SET category_code = 'GEO' WHERE slug = 'geography';
UPDATE categories SET category_code = 'HIST' WHERE slug = 'history';
UPDATE categories SET category_code = 'MYTH' WHERE slug = 'mythology';
UPDATE categories SET category_code = 'NAT' WHERE slug = 'nature';
UPDATE categories SET category_code = 'SCI' WHERE slug = 'science';
UPDATE categories SET category_code = 'SPORT' WHERE slug = 'sports';
UPDATE categories SET category_code = 'TECH' WHERE slug = 'technology';
UPDATE categories SET category_code = 'WEIRD' WHERE slug = 'weird-wonderful';

ALTER TABLE categories 
ALTER COLUMN category_code SET NOT NULL;

CREATE UNIQUE INDEX idx_categories_code ON categories(category_code);

-- Add type_code to player_nfts
ALTER TABLE player_nfts 
ADD COLUMN IF NOT EXISTS type_code VARCHAR(10);

-- Ensure token_name can hold 32+ characters
ALTER TABLE player_nfts 
ALTER COLUMN token_name TYPE VARCHAR(64);

ALTER TABLE mints 
ALTER COLUMN token_name TYPE VARCHAR(64);
```

## Validation Rules

### Format Requirements

1. **Prefix**: Must start with `TNFT_V1_`
2. **Length**: Total length ≤ 32 bytes
3. **Characters**: Only A-Z, 0-9, and underscore
4. **Hex ID**: Exactly 8 lowercase hex characters [0-9a-f]
5. **Category Code**: Must be one of 10 valid codes (if applicable)
6. **Tier Code**: Must be REG, ULT, MAST, or SEAS
7. **Season Code**: Must match pattern (if applicable)

### Error Codes

```typescript
const ERROR_CODES = {
  INVALID_PREFIX: 'INVALID_PREFIX',
  INVALID_VERSION: 'INVALID_VERSION',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_CHARACTERS: 'INVALID_CHARACTERS',
  INVALID_CATEGORY_CODE: 'INVALID_CATEGORY_CODE',
  INVALID_TIER_CODE: 'INVALID_TIER_CODE',
  INVALID_SEASON_CODE: 'INVALID_SEASON_CODE',
  INVALID_HEX_ID: 'INVALID_HEX_ID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD'
};
```

## Testing Requirements

### Property-Based Tests (12 total)

Using fast-check library with 100+ iterations each:

1. Asset name format consistency
2. Asset name length constraint
3. Asset name character set
4. Build-parse round trip
5. Category code bidirectional mapping
6. Tier 1 format correctness
7. Tier 2 format correctness
8. Tier 3 format correctness
9. Tier 4 format correctness
10. Season code round trip
11. Validation rejects invalid formats
12. Hex ID format

### Integration Tests (4 total)

1. Database migration
2. Minting with new asset names
3. Category Ultimate forging
4. Master Ultimate forging
5. Seasonal Ultimate forging

## Implementation Timeline

### Phase 1: Core Utilities (Week 1)
- Implement naming utilities
- Implement category/season code mapping
- Write all property-based tests

### Phase 2: Database (Week 1)
- Create migration scripts
- Test on development database

### Phase 3: Service Integration (Week 2)
- Update minting service
- Update forging service
- Write integration tests

### Phase 4: Documentation (Week 2)
- Update COMPLETE_NFT_SYSTEM_GUIDE.md
- Add API documentation

### Phase 5: Testing (Week 3)
- Run all tests
- Validate on testnet

### Phase 6: Deployment (Week 3)
- Deploy to preprod
- Deploy to production

## Next Steps

### To Update the Guide

1. Open `COMPLETE_NFT_SYSTEM_GUIDE.md`
2. Find the "NFT Naming Convention" or "Technical Details" section
3. Replace with content from `UPDATED_GUIDE_SECTION.md`
4. Update any other references to old token names throughout the guide

### To Start Implementation

1. Review the requirements document
2. Review the design document
3. Open the tasks.md file in Kiro
4. Click "Start task" on Task 1 to begin implementation

### To Execute Tasks

You can now execute the tasks by:
1. Opening `.kiro/specs/nft-naming-convention/tasks.md`
2. Clicking "Start task" next to any task item
3. Or asking me to "execute task 1" (or any task number)

## Key Benefits

1. **Consistency**: All asset names follow the same pattern
2. **Parseability**: Easy to extract tier, category, and season information
3. **Brevity**: Short identifiers (≤32 bytes) for on-chain efficiency
4. **Clarity**: Clear separation between asset names and display names
5. **Extensibility**: Version field allows future changes (V2, V3, etc.)
6. **Testability**: Comprehensive property-based testing ensures correctness

## Questions?

If you have any questions about the spec or implementation, feel free to ask!
