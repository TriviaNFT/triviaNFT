# Design Document

## Overview

This design document specifies the implementation of a new standardized naming convention for TriviaNFT's on-chain Cardano asset names. The system will generate short, fixed-length, ASCII-only identifiers following the pattern `TNFT_V1_{...}_{id}`, while maintaining human-friendly display names in metadata and database storage.

The design ensures backward compatibility where possible and provides clear migration paths for existing NFTs.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                   NFT Naming System                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Builder    │   │    Parser    │   │  Validator   │
│   Module     │   │    Module    │   │    Module    │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Minting    │   │   Forging    │   │   Database   │
│   Service    │   │   Service    │   │   Layer      │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Component Responsibilities

1. **Builder Module**: Constructs asset names from tier, category, season, and ID parameters
2. **Parser Module**: Extracts structured data from asset name strings
3. **Validator Module**: Ensures asset names conform to specification
4. **Minting Service**: Uses builder to generate asset names during NFT minting
5. **Forging Service**: Uses builder to generate asset names during NFT forging
6. **Database Layer**: Stores both asset names and display names

## Components and Interfaces

### 1. Asset Name Builder

**Module**: `src/utils/nft-naming.ts`

```typescript
interface BuildAssetNameParams {
  tier: 'category' | 'category_ultimate' | 'master_ultimate' | 'seasonal_ultimate';
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string; // 8-character hex
}

interface AssetNameComponents {
  prefix: 'TNFT';
  version: 'V1';
  tier: TierCode;
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string;
}

function buildAssetName(params: BuildAssetNameParams): string;
function parseAssetName(assetName: string): AssetNameComponents | null;
function validateAssetName(assetName: string): boolean;
function generateHexId(): string;
```

### 2. Category Code Mapping

**Module**: `src/utils/category-codes.ts`

```typescript
type CategoryCode = 'ARTS' | 'ENT' | 'GEO' | 'HIST' | 'MYTH' | 'NAT' | 'SCI' | 'SPORT' | 'TECH' | 'WEIRD';

type CategorySlug = 'arts' | 'entertainment' | 'geography' | 'history' | 'mythology' | 'nature' | 'science' | 'sports' | 'technology' | 'weird-wonderful';

const CATEGORY_CODE_MAP: Record<CategorySlug, CategoryCode>;
const CATEGORY_SLUG_MAP: Record<CategoryCode, CategorySlug>;

function getCategoryCode(slug: CategorySlug): CategoryCode;
function getCategorySlug(code: CategoryCode): CategorySlug;
```

### 3. Season Code Mapping

**Module**: `src/utils/season-codes.ts`

```typescript
type SeasonCode = 'WI1' | 'SP1' | 'SU1' | 'FA1' | 'WI2' | 'SP2' | 'SU2' | 'FA2' | string;

interface SeasonInfo {
  code: SeasonCode;
  name: string;
  year: number;
  season: 'winter' | 'spring' | 'summer' | 'fall';
}

function getSeasonCode(seasonId: string): SeasonCode;
function parseSeasonCode(code: SeasonCode): SeasonInfo;
```

### 4. Minting Service Integration

**Module**: `src/services/minting-service.ts`

```typescript
interface MintNFTParams {
  catalogId: string;
  stakeKey: string;
  eligibilityId: string;
  // ... other params
}

async function mintNFT(params: MintNFTParams): Promise<MintResult> {
  // 1. Fetch NFT catalog entry
  const catalog = await db.getNFTCatalog(params.catalogId);
  
  // 2. Generate asset name
  const hexId = generateHexId();
  const categoryCode = getCategoryCode(catalog.category.slug);
  const assetName = buildAssetName({
    tier: 'category',
    categoryCode,
    id: hexId
  });
  
  // 3. Build transaction with new asset name
  // 4. Include display name in metadata
  // 5. Store both asset_name and display_name in database
}
```

### 5. Forging Service Integration

**Module**: `src/services/forging-service.ts`

```typescript
async function forgeUltimate(params: ForgeParams): Promise<ForgeResult> {
  // 1. Validate input NFTs
  // 2. Determine forge type and generate appropriate asset name
  const hexId = generateHexId();
  
  let assetName: string;
  if (params.type === 'category') {
    const categoryCode = getCategoryCode(params.categorySlug);
    assetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: hexId
    });
  } else if (params.type === 'master') {
    assetName = buildAssetName({
      tier: 'master_ultimate',
      id: hexId
    });
  } else if (params.type === 'season') {
    const seasonCode = getSeasonCode(params.seasonId);
    assetName = buildAssetName({
      tier: 'seasonal_ultimate',
      seasonCode,
      id: hexId
    });
  }
  
  // 3. Build burn and mint transactions
  // 4. Include metadata with display name
}
```

## Data Models

### Database Schema Updates

#### nft_catalog Table

```sql
ALTER TABLE nft_catalog 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);

-- Migrate existing names to display_name
UPDATE nft_catalog 
SET display_name = name 
WHERE display_name IS NULL;

-- Add comment
COMMENT ON COLUMN nft_catalog.display_name IS 'Human-friendly NFT name (e.g., "Quantum Explorer")';
COMMENT ON COLUMN nft_catalog.name IS 'Legacy field, use display_name instead';
```

#### categories Table

```sql
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_code VARCHAR(10);

-- Populate category codes
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
```

#### player_nfts Table

```sql
-- Ensure token_name can hold 32 characters
ALTER TABLE player_nfts 
ALTER COLUMN token_name TYPE VARCHAR(64);

-- Add type_code column for quick tier identification
ALTER TABLE player_nfts 
ADD COLUMN IF NOT EXISTS type_code VARCHAR(10);

COMMENT ON COLUMN player_nfts.type_code IS 'Tier code: REG, ULT, MAST, or SEAS';
```

#### mints Table

```sql
-- Ensure token_name can hold 32 characters
ALTER TABLE mints 
ALTER COLUMN token_name TYPE VARCHAR(64);
```

### Metadata Structure

#### CIP-25 Metadata Format

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_SCI_REG_12b3de7d": {
        "name": "Quantum Explorer",
        "description": "A Science trivia NFT earned by achieving a perfect score",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "files": [{
          "name": "quantum-explorer.png",
          "mediaType": "image/png",
          "src": "ipfs://Qm..."
        }],
        "attributes": {
          "Category": "Science",
          "CategoryCode": "SCI",
          "Tier": "category",
          "TierCode": "REG",
          "Rarity": "Common",
          "AssetName": "TNFT_V1_SCI_REG_12b3de7d",
          "DisplayName": "Quantum Explorer"
        }
      }
    }
  }
}
```

#### Ultimate NFT Metadata Example

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_SCI_ULT_46fbf442": {
        "name": "Science Category Ultimate",
        "description": "Forged from 10 Science NFTs, representing mastery of scientific knowledge",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "attributes": {
          "Category": "Science",
          "CategoryCode": "SCI",
          "Tier": "category_ultimate",
          "TierCode": "ULT",
          "Rarity": "Rare",
          "AssetName": "TNFT_V1_SCI_ULT_46fbf442",
          "DisplayName": "Science Category Ultimate"
        }
      }
    }
  }
}
```

#### Seasonal Ultimate Metadata Example

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_SEAS_WI1_ULT_0559c272": {
        "name": "Winter Season 1 Ultimate",
        "description": "Forged from 20 seasonal NFTs during Winter Season 1",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "attributes": {
          "Tier": "seasonal_ultimate",
          "TierCode": "SEAS",
          "SeasonCode": "WI1",
          "Season": "Winter Season 1",
          "Rarity": "Legendary",
          "AssetName": "TNFT_V1_SEAS_WI1_ULT_0559c272",
          "DisplayName": "Winter Season 1 Ultimate"
        }
      }
    }
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Asset name format consistency
*For any* valid NFT parameters (tier, category, season, id), the generated asset name should start with "TNFT_V1_" and end with an 8-character hex ID
**Validates: Requirements 1.1, 1.4**

### Property 2: Asset name length constraint
*For any* generated asset name, the total byte length should not exceed 32 bytes
**Validates: Requirements 1.2**

### Property 3: Asset name character set
*For any* generated asset name, every character should be from the set [A-Z, 0-9, _]
**Validates: Requirements 1.3**

### Property 4: Build-parse round trip
*For any* valid NFT parameters, building an asset name and then parsing it should return the original parameters
**Validates: Requirements 1.5, 6.1-6.7**

### Property 5: Category code bidirectional mapping
*For any* valid category slug, converting to category code and back to slug should return the original slug
**Validates: Requirements 2.1-2.11**

### Property 6: Tier 1 format correctness
*For any* Category NFT with valid category code and hex ID, the asset name should match the pattern `TNFT_V1_{CAT}_REG_{id}`
**Validates: Requirements 3.1**

### Property 7: Tier 2 format correctness
*For any* Category Ultimate NFT with valid category code and hex ID, the asset name should match the pattern `TNFT_V1_{CAT}_ULT_{id}`
**Validates: Requirements 3.2**

### Property 8: Tier 3 format correctness
*For any* Master Ultimate NFT with valid hex ID, the asset name should match the pattern `TNFT_V1_MAST_{id}`
**Validates: Requirements 3.3**

### Property 9: Tier 4 format correctness
*For any* Seasonal Ultimate NFT with valid season code and hex ID, the asset name should match the pattern `TNFT_V1_SEAS_{SeasonCode}_ULT_{id}`
**Validates: Requirements 3.4**

### Property 10: Season code round trip
*For any* valid season ID, converting to season code and parsing back should preserve the season information
**Validates: Requirements 4.1-4.6**

### Property 11: Validation rejects invalid formats
*For any* string that does not match the asset name specification, the validator should return false or throw an error
**Validates: Requirements 7.1-7.7**

### Property 12: Hex ID format
*For any* generated hex ID, it should be exactly 8 characters and contain only lowercase hexadecimal characters [0-9a-f]
**Validates: Requirements 1.4**

## Error Handling

### Validation Errors

```typescript
class AssetNameValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AssetNameValidationError';
  }
}

// Error codes
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

### Error Scenarios

1. **Invalid Tier**: Throw error if tier is not one of the four valid types
2. **Missing Category**: Throw error if Category/Category Ultimate tier lacks category code
3. **Missing Season**: Throw error if Seasonal Ultimate tier lacks season code
4. **Invalid Hex ID**: Throw error if ID is not 8 characters or contains non-hex characters
5. **Length Exceeded**: Throw error if generated asset name exceeds 32 bytes
6. **Parse Failure**: Return null or throw error if asset name cannot be parsed

### Graceful Degradation

- If parsing fails, log error and return null rather than crashing
- If validation fails during minting, halt transaction and notify user
- If category code mapping fails, fall back to slug-based lookup

## Testing Strategy

### Unit Testing

**Test Coverage Areas:**
1. Asset name builder function with all tier types
2. Asset name parser function with valid and invalid inputs
3. Validator function with edge cases
4. Category code mapping bidirectional conversion
5. Season code generation and parsing
6. Hex ID generation (uniqueness, format)
7. Error handling for all validation scenarios

**Example Unit Tests:**
```typescript
describe('buildAssetName', () => {
  it('should build Category NFT asset name', () => {
    const result = buildAssetName({
      tier: 'category',
      categoryCode: 'SCI',
      id: '12b3de7d'
    });
    expect(result).toBe('TNFT_V1_SCI_REG_12b3de7d');
  });

  it('should build Master Ultimate asset name', () => {
    const result = buildAssetName({
      tier: 'master_ultimate',
      id: '41871703'
    });
    expect(result).toBe('TNFT_V1_MAST_41871703');
  });

  it('should throw error for missing category code', () => {
    expect(() => buildAssetName({
      tier: 'category',
      id: '12b3de7d'
    })).toThrow(AssetNameValidationError);
  });
});

describe('parseAssetName', () => {
  it('should parse Category NFT asset name', () => {
    const result = parseAssetName('TNFT_V1_SCI_REG_12b3de7d');
    expect(result).toEqual({
      prefix: 'TNFT',
      version: 'V1',
      tier: 'REG',
      categoryCode: 'SCI',
      id: '12b3de7d'
    });
  });

  it('should return null for invalid format', () => {
    const result = parseAssetName('INVALID_NAME');
    expect(result).toBeNull();
  });
});
```

### Property-Based Testing

**Testing Framework:** fast-check (for TypeScript/JavaScript)

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Use custom generators for category codes, season codes, and hex IDs
- Test with edge cases (empty strings, max length, special characters)

**Example Property Tests:**
```typescript
import fc from 'fast-check';

describe('Asset Name Properties', () => {
  // Generator for valid category codes
  const categoryCodeArb = fc.constantFrom(
    'ARTS', 'ENT', 'GEO', 'HIST', 'MYTH', 
    'NAT', 'SCI', 'SPORT', 'TECH', 'WEIRD'
  );

  // Generator for valid hex IDs
  const hexIdArb = fc.hexaString({ minLength: 8, maxLength: 8 });

  // Generator for valid season codes
  const seasonCodeArb = fc.constantFrom(
    'WI1', 'SP1', 'SU1', 'FA1',
    'WI2', 'SP2', 'SU2', 'FA2'
  );

  it('Property 1: Asset name format consistency', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category',
            categoryCode,
            id
          });
          return assetName.startsWith('TNFT_V1_') && 
                 assetName.endsWith(id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Asset name length constraint', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('category', 'category_ultimate', 'master_ultimate', 'seasonal_ultimate'),
        categoryCodeArb,
        seasonCodeArb,
        hexIdArb,
        (tier, categoryCode, seasonCode, id) => {
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

  it('Property 4: Build-parse round trip', () => {
    fc.assert(
      fc.property(
        categoryCodeArb,
        hexIdArb,
        (categoryCode, id) => {
          const assetName = buildAssetName({
            tier: 'category',
            categoryCode,
            id
          });
          const parsed = parseAssetName(assetName);
          
          return parsed !== null &&
                 parsed.prefix === 'TNFT' &&
                 parsed.version === 'V1' &&
                 parsed.categoryCode === categoryCode &&
                 parsed.id === id;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Category code bidirectional mapping', () => {
    const categorySlugArb = fc.constantFrom(
      'arts', 'entertainment', 'geography', 'history', 'mythology',
      'nature', 'science', 'sports', 'technology', 'weird-wonderful'
    );

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
});
```

### Integration Testing

**Test Scenarios:**
1. Mint a Category NFT and verify asset name in database and on-chain
2. Forge a Category Ultimate and verify asset name format
3. Forge a Master Ultimate and verify asset name format
4. Forge a Seasonal Ultimate and verify season code in asset name
5. Query NFTs by asset name pattern
6. Verify metadata includes both asset name and display name

### Migration Testing

**Test Scenarios:**
1. Run migration on test database with existing NFTs
2. Verify all NFTs have new asset names
3. Verify display names are preserved
4. Verify category codes are populated
5. Verify no data loss during migration

## Implementation Phases

### Phase 1: Core Utilities (Week 1)
- Implement asset name builder function
- Implement asset name parser function
- Implement validator function
- Implement category code mapping
- Implement season code utilities
- Implement hex ID generator
- Write unit tests for all utilities

### Phase 2: Database Updates (Week 1)
- Create migration scripts for schema changes
- Add display_name column to nft_catalog
- Add category_code column to categories
- Add type_code column to player_nfts
- Test migrations on development database

### Phase 3: Service Integration (Week 2)
- Update minting service to use new naming
- Update forging service to use new naming
- Update metadata generation to include both names
- Update database queries to use new fields
- Write integration tests

### Phase 4: Documentation (Week 2)
- Update COMPLETE_NFT_SYSTEM_GUIDE.md
- Add API documentation for new utilities
- Create migration guide for existing deployments
- Update code examples throughout codebase

### Phase 5: Testing & Validation (Week 3)
- Run property-based tests
- Run integration tests on testnet
- Verify on-chain asset names
- Validate metadata format
- Performance testing

### Phase 6: Deployment (Week 3)
- Deploy to preprod environment
- Run migration on preprod database
- Verify existing NFTs still work
- Deploy to production
- Monitor for issues

## Migration Strategy

### Existing NFT Handling

**Option 1: Dual Support (Recommended)**
- Keep existing NFTs with old token names
- Generate new asset names for new NFTs only
- Parser supports both old and new formats
- Gradual transition over time

**Option 2: Full Migration**
- Generate new asset names for all existing NFTs
- Update database records
- Note: Cannot change on-chain token names (immutable)
- Only update database representation

### Backward Compatibility

```typescript
function parseAssetName(assetName: string): AssetNameComponents | null {
  // Try new format first
  const newFormat = parseNewFormat(assetName);
  if (newFormat) return newFormat;
  
  // Fall back to legacy format
  const legacyFormat = parseLegacyFormat(assetName);
  if (legacyFormat) return legacyFormat;
  
  // Unable to parse
  return null;
}
```

## Performance Considerations

### Asset Name Generation
- O(1) time complexity
- No database lookups required
- Can be cached if needed

### Asset Name Parsing
- O(1) time complexity
- Simple string splitting and validation
- No regex for performance

### Database Queries
- Index on token_name for fast lookups
- Index on category_code for category queries
- Index on type_code for tier filtering

## Security Considerations

### Input Validation
- Validate all inputs before building asset names
- Prevent injection attacks through category/season codes
- Sanitize hex IDs to ensure valid format

### Uniqueness
- Hex ID generation must be cryptographically random
- Check for collisions (extremely unlikely with 8-char hex)
- Database unique constraint on asset_fingerprint

### Access Control
- Only authorized services can mint NFTs
- Validate ownership before forging
- Audit log for all asset name generation

## Monitoring and Observability

### Metrics to Track
- Asset name generation success rate
- Parse success rate
- Validation failure rate by error code
- Average asset name length
- Distribution of tier types

### Logging
- Log all asset name generation with parameters
- Log validation failures with details
- Log migration progress and errors
- Log any fallback to legacy format

### Alerts
- Alert on validation failure rate > 1%
- Alert on parse failure rate > 1%
- Alert on asset name length > 30 bytes
- Alert on hex ID collision (should never happen)

## Future Enhancements

### Version 2 Considerations
- If naming convention changes, increment version (V2)
- Parser can support multiple versions
- Builder can target specific version

### Additional Metadata
- Consider adding mint timestamp to asset name
- Consider adding rarity tier to asset name
- Balance between information and length constraint

### Tooling
- CLI tool for generating asset names
- Web interface for parsing asset names
- Validation service endpoint
