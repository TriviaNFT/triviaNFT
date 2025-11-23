# NFT Naming Convention API Documentation

## Overview

This document provides comprehensive API documentation for the TriviaNFT naming convention utilities. These utilities enable building, parsing, and validating standardized NFT asset names for the Cardano blockchain.

## Table of Contents

- [Asset Name Format](#asset-name-format)
- [Core Functions](#core-functions)
  - [buildAssetName()](#buildassetname)
  - [parseAssetName()](#parseassetname)
  - [validateAssetName()](#validateassetname)
  - [generateHexId()](#generatehexid)
- [Category Code Functions](#category-code-functions)
  - [getCategoryCode()](#getcategorycode)
  - [getCategorySlug()](#getcategoryslug)
- [Season Code Functions](#season-code-functions)
  - [getSeasonCode()](#getseasoncode)
  - [parseSeasonCode()](#parseseasoncode)
  - [validateSeasonCode()](#validateseasoncode)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Usage Examples by Tier](#usage-examples-by-tier)

---

## Asset Name Format

The TriviaNFT naming convention uses a standardized format for on-chain asset names:

```
TNFT_V1_{...}_{id}
```

### Format by Tier

| Tier | Type | Format | Example |
|------|------|--------|---------|
| 1 | Category NFT | `TNFT_V1_{CAT}_REG_{id}` | `TNFT_V1_SCI_REG_12b3de7d` |
| 2 | Category Ultimate | `TNFT_V1_{CAT}_ULT_{id}` | `TNFT_V1_SCI_ULT_46fbf442` |
| 3 | Master Ultimate | `TNFT_V1_MAST_{id}` | `TNFT_V1_MAST_41871703` |
| 4 | Seasonal Ultimate | `TNFT_V1_SEAS_{SeasonCode}_ULT_{id}` | `TNFT_V1_SEAS_WI1_ULT_0559c272` |

### Constraints

- **Maximum Length**: 32 bytes
- **Character Set**: A-Z, 0-9, underscore (_)
- **Hex ID**: 8 lowercase hexadecimal characters (0-9, a-f)
- **Prefix**: Always `TNFT` (TriviaNFT)
- **Version**: Always `V1` (version 1)

---

## Core Functions

### buildAssetName()

Constructs a standardized asset name from the provided parameters.

#### Signature

```typescript
function buildAssetName(params: BuildAssetNameParams): string
```

#### Parameters

```typescript
interface BuildAssetNameParams {
  tier: 'category' | 'category_ultimate' | 'master_ultimate' | 'seasonal_ultimate';
  categoryCode?: CategoryCode;  // Required for category and category_ultimate
  seasonCode?: SeasonCode;      // Required for seasonal_ultimate
  id: string;                   // 8-character hex ID
}
```

#### Returns

- `string` - The formatted asset name

#### Throws

- `AssetNameValidationError` - If parameters are invalid

#### Examples

**Tier 1 - Category NFT:**
```typescript
import { buildAssetName, generateHexId } from './nft-naming';

const assetName = buildAssetName({
  tier: 'category',
  categoryCode: 'SCI',
  id: generateHexId()
});
// Returns: 'TNFT_V1_SCI_REG_12b3de7d'
```

**Tier 2 - Category Ultimate NFT:**
```typescript
const assetName = buildAssetName({
  tier: 'category_ultimate',
  categoryCode: 'HIST',
  id: '46fbf442'
});
// Returns: 'TNFT_V1_HIST_ULT_46fbf442'
```

**Tier 3 - Master Ultimate NFT:**
```typescript
const assetName = buildAssetName({
  tier: 'master_ultimate',
  id: '41871703'
});
// Returns: 'TNFT_V1_MAST_41871703'
```

**Tier 4 - Seasonal Ultimate NFT:**
```typescript
const assetName = buildAssetName({
  tier: 'seasonal_ultimate',
  seasonCode: 'WI1',
  id: '0559c272'
});
// Returns: 'TNFT_V1_SEAS_WI1_ULT_0559c272'
```

#### Validation Rules

1. **Hex ID**: Must be exactly 8 lowercase hexadecimal characters
2. **Category Code**: Required for `category` and `category_ultimate` tiers
3. **Season Code**: Required for `seasonal_ultimate` tier
4. **Length**: Final asset name must not exceed 32 bytes

---

### parseAssetName()

Extracts structured components from an asset name string. Supports both new standardized format and legacy format.

#### Signature

```typescript
function parseAssetName(assetName: string): AssetNameComponents | null
```

#### Parameters

- `assetName` (string) - The asset name to parse

#### Returns

```typescript
interface AssetNameComponents {
  prefix: 'TNFT';
  version: 'V1';
  tier: TierCode;           // 'REG' | 'ULT' | 'MAST' | 'SEAS'
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string;
}
```

Returns `null` if the asset name is invalid or cannot be parsed.

#### Examples

**Parse Tier 1 (Category NFT):**
```typescript
import { parseAssetName } from './nft-naming';

const components = parseAssetName('TNFT_V1_SCI_REG_12b3de7d');
console.log(components);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'REG',
//   categoryCode: 'SCI',
//   id: '12b3de7d'
// }
```

**Parse Tier 2 (Category Ultimate):**
```typescript
const components = parseAssetName('TNFT_V1_ARTS_ULT_46fbf442');
console.log(components);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'ULT',
//   categoryCode: 'ARTS',
//   id: '46fbf442'
// }
```

**Parse Tier 3 (Master Ultimate):**
```typescript
const components = parseAssetName('TNFT_V1_MAST_41871703');
console.log(components);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'MAST',
//   id: '41871703'
// }
```

**Parse Tier 4 (Seasonal Ultimate):**
```typescript
const components = parseAssetName('TNFT_V1_SEAS_WI1_ULT_0559c272');
console.log(components);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'SEAS',
//   seasonCode: 'WI1',
//   id: '0559c272'
// }
```

**Parse Legacy Format:**
```typescript
const components = parseAssetName('quantum-explorer');
console.log(components);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'REG',
//   id: 'quantum-explorer'
// }
```

**Invalid Asset Name:**
```typescript
const components = parseAssetName('INVALID_NAME');
console.log(components);
// null
```

#### Use Cases

- Extracting tier information from on-chain asset names
- Determining category from asset name
- Identifying seasonal NFTs
- Supporting backward compatibility with legacy names

---

### validateAssetName()

Validates an asset name against the specification. Supports both new standardized format and legacy format.

#### Signature

```typescript
function validateAssetName(assetName: string): boolean
```

#### Parameters

- `assetName` (string) - The asset name to validate

#### Returns

- `boolean` - `true` if valid, `false` otherwise

#### Examples

**Valid Asset Names:**
```typescript
import { validateAssetName } from './nft-naming';

validateAssetName('TNFT_V1_SCI_REG_12b3de7d');     // true
validateAssetName('TNFT_V1_HIST_ULT_46fbf442');    // true
validateAssetName('TNFT_V1_MAST_41871703');        // true
validateAssetName('TNFT_V1_SEAS_WI1_ULT_0559c272'); // true
validateAssetName('quantum-explorer');              // true (legacy)
```

**Invalid Asset Names:**
```typescript
validateAssetName('INVALID_NAME');                 // false
validateAssetName('TNFT_V2_SCI_REG_12b3de7d');    // false (wrong version)
validateAssetName('TNFT_V1_SCI_REG_INVALID');     // false (invalid hex ID)
validateAssetName('');                             // false
validateAssetName(null);                           // false
```

#### Use Cases

- Pre-validation before minting
- Input validation in APIs
- Data integrity checks
- Testing and debugging

---

### generateHexId()

Generates a cryptographically random 8-character lowercase hexadecimal ID.

#### Signature

```typescript
function generateHexId(): string
```

#### Returns

- `string` - An 8-character lowercase hexadecimal string

#### Examples

```typescript
import { generateHexId } from './nft-naming';

const id1 = generateHexId();
console.log(id1); // '12b3de7d'

const id2 = generateHexId();
console.log(id2); // '46fbf442'

const id3 = generateHexId();
console.log(id3); // '0559c272'
```

#### Use Cases

- Generating unique IDs for new NFTs
- Ensuring uniqueness across mints
- Creating identifiers for forged NFTs

#### Notes

- Uses Node.js `crypto.randomBytes()` for cryptographic randomness
- Collision probability is extremely low (1 in 4.3 billion)
- Always generates lowercase hexadecimal characters (0-9, a-f)

---

## Category Code Functions

### getCategoryCode()

Converts a category slug to its corresponding short code.

#### Signature

```typescript
function getCategoryCode(slug: CategorySlug): CategoryCode
```

#### Parameters

- `slug` (CategorySlug) - The category slug (e.g., 'science', 'arts')

#### Returns

- `CategoryCode` - The category code (e.g., 'SCI', 'ARTS')

#### Throws

- `Error` - If the slug is not recognized

#### Category Mapping Table

| Slug | Code | Category Name |
|------|------|---------------|
| `arts` | `ARTS` | Arts & Literature |
| `entertainment` | `ENT` | Entertainment |
| `geography` | `GEO` | Geography |
| `history` | `HIST` | History |
| `mythology` | `MYTH` | Mythology |
| `nature` | `NAT` | Nature |
| `science` | `SCI` | Science |
| `sports` | `SPORT` | Sports |
| `technology` | `TECH` | Technology |
| `weird-wonderful` | `WEIRD` | Weird & Wonderful |

#### Examples

```typescript
import { getCategoryCode } from './category-codes';

getCategoryCode('science');        // 'SCI'
getCategoryCode('arts');           // 'ARTS'
getCategoryCode('entertainment');  // 'ENT'
getCategoryCode('history');        // 'HIST'
getCategoryCode('weird-wonderful'); // 'WEIRD'

// Invalid slug throws error
getCategoryCode('invalid');        // throws Error
```

#### Use Cases

- Converting database category slugs to asset name codes
- Building asset names from category information
- Validating category data

---

### getCategorySlug()

Converts a category code to its corresponding slug.

#### Signature

```typescript
function getCategorySlug(code: CategoryCode): CategorySlug
```

#### Parameters

- `code` (CategoryCode) - The category code (e.g., 'SCI', 'ARTS')

#### Returns

- `CategorySlug` - The category slug (e.g., 'science', 'arts')

#### Throws

- `Error` - If the code is not recognized

#### Examples

```typescript
import { getCategorySlug } from './category-codes';

getCategorySlug('SCI');    // 'science'
getCategorySlug('ARTS');   // 'arts'
getCategorySlug('ENT');    // 'entertainment'
getCategorySlug('HIST');   // 'history'
getCategorySlug('WEIRD');  // 'weird-wonderful'

// Invalid code throws error
getCategorySlug('INVALID'); // throws Error
```

#### Use Cases

- Parsing asset names to determine category
- Displaying category information from codes
- Database lookups from asset names

---

## Season Code Functions

### getSeasonCode()

Generates a season code from season type and number.

#### Signature

```typescript
function getSeasonCode(season: SeasonType, seasonNumber: number): SeasonCode
```

#### Parameters

- `season` (SeasonType) - The season type: `'winter'`, `'spring'`, `'summer'`, or `'fall'`
- `seasonNumber` (number) - The season number (positive integer)

#### Returns

- `SeasonCode` - The season code (e.g., 'WI1', 'SP2')

#### Throws

- `Error` - If season is invalid or seasonNumber is not a positive integer

#### Season Code Format

| Season | Code Prefix | Example |
|--------|-------------|---------|
| Winter | `WI` | `WI1`, `WI2`, `WI3` |
| Spring | `SP` | `SP1`, `SP2`, `SP3` |
| Summer | `SU` | `SU1`, `SU2`, `SU3` |
| Fall | `FA` | `FA1`, `FA2`, `FA3` |

#### Examples

```typescript
import { getSeasonCode } from './season-codes';

getSeasonCode('winter', 1);  // 'WI1'
getSeasonCode('spring', 1);  // 'SP1'
getSeasonCode('summer', 2);  // 'SU2'
getSeasonCode('fall', 3);    // 'FA3'

// Invalid inputs throw errors
getSeasonCode('invalid', 1);  // throws Error
getSeasonCode('winter', 0);   // throws Error
getSeasonCode('winter', -1);  // throws Error
```

#### Use Cases

- Building seasonal ultimate NFT asset names
- Generating season identifiers
- Season-based NFT categorization

---

### parseSeasonCode()

Parses a season code and extracts season information.

#### Signature

```typescript
function parseSeasonCode(code: SeasonCode): SeasonInfo
```

#### Parameters

- `code` (SeasonCode) - The season code to parse (e.g., 'WI1', 'SP2')

#### Returns

```typescript
interface SeasonInfo {
  code: SeasonCode;
  name: string;
  seasonNumber: number;
  season: SeasonType;
}
```

#### Throws

- `Error` - If the code format is invalid

#### Examples

```typescript
import { parseSeasonCode } from './season-codes';

const info1 = parseSeasonCode('WI1');
console.log(info1);
// {
//   code: 'WI1',
//   name: 'Winter Season 1',
//   seasonNumber: 1,
//   season: 'winter'
// }

const info2 = parseSeasonCode('SP2');
console.log(info2);
// {
//   code: 'SP2',
//   name: 'Spring Season 2',
//   seasonNumber: 2,
//   season: 'spring'
// }

const info3 = parseSeasonCode('SU10');
console.log(info3);
// {
//   code: 'SU10',
//   name: 'Summer Season 10',
//   seasonNumber: 10,
//   season: 'summer'
// }

// Invalid code throws error
parseSeasonCode('INVALID'); // throws Error
```

#### Use Cases

- Extracting season information from asset names
- Displaying season details to users
- Season-based filtering and queries

---

### validateSeasonCode()

Validates a season code format.

#### Signature

```typescript
function validateSeasonCode(code: string): boolean
```

#### Parameters

- `code` (string) - The season code to validate

#### Returns

- `boolean` - `true` if valid, `false` otherwise

#### Examples

```typescript
import { validateSeasonCode } from './season-codes';

validateSeasonCode('WI1');     // true
validateSeasonCode('SP2');     // true
validateSeasonCode('SU10');    // true
validateSeasonCode('FA999');   // true
validateSeasonCode('INVALID'); // false
validateSeasonCode('WI');      // false (missing number)
validateSeasonCode('XX1');     // false (invalid prefix)
```

#### Use Cases

- Input validation
- Pre-validation before parsing
- Data integrity checks

---

## Type Definitions

### TierType

```typescript
type TierType = 
  | 'category' 
  | 'category_ultimate' 
  | 'master_ultimate' 
  | 'seasonal_ultimate';
```

### TierCode

```typescript
type TierCode = 'REG' | 'ULT' | 'MAST' | 'SEAS';
```

### CategoryCode

```typescript
type CategoryCode = 
  | 'ARTS' 
  | 'ENT' 
  | 'GEO' 
  | 'HIST' 
  | 'MYTH' 
  | 'NAT' 
  | 'SCI' 
  | 'SPORT' 
  | 'TECH' 
  | 'WEIRD';
```

### CategorySlug

```typescript
type CategorySlug = 
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
```

### SeasonCode

```typescript
type SeasonCode = string; // Format: WI1, SP1, SU1, FA1, WI2, etc.
```

### SeasonType

```typescript
type SeasonType = 'winter' | 'spring' | 'summer' | 'fall';
```

---

## Error Handling

### AssetNameValidationError

Custom error class for asset name validation failures.

```typescript
class AssetNameValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  );
}
```

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

### Example Error Handling

```typescript
import { buildAssetName, AssetNameValidationError } from './nft-naming';

try {
  const assetName = buildAssetName({
    tier: 'category',
    categoryCode: 'SCI',
    id: 'INVALID' // Invalid hex ID
  });
} catch (error) {
  if (error instanceof AssetNameValidationError) {
    console.error('Validation Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Details:', error.details);
  }
}
```

---

## Usage Examples by Tier

### Tier 1: Category NFT

Complete workflow for minting a Category NFT:

```typescript
import { 
  buildAssetName, 
  generateHexId, 
  getCategoryCode,
  validateAssetName 
} from './nft-naming';

// 1. Get category code from slug
const categorySlug = 'science';
const categoryCode = getCategoryCode(categorySlug); // 'SCI'

// 2. Generate unique ID
const hexId = generateHexId(); // '12b3de7d'

// 3. Build asset name
const assetName = buildAssetName({
  tier: 'category',
  categoryCode,
  id: hexId
});
console.log(assetName); // 'TNFT_V1_SCI_REG_12b3de7d'

// 4. Validate before minting
if (validateAssetName(assetName)) {
  // Proceed with minting
  console.log('Asset name is valid, proceeding with mint');
}
```

### Tier 2: Category Ultimate NFT

Complete workflow for forging a Category Ultimate NFT:

```typescript
import { 
  buildAssetName, 
  generateHexId, 
  parseAssetName,
  getCategoryCode 
} from './nft-naming';

// 1. Parse input NFTs to verify they're all the same category
const inputNFTs = [
  'TNFT_V1_SCI_REG_12b3de7d',
  'TNFT_V1_SCI_REG_46fbf442',
  // ... 8 more Science NFTs
];

const categories = inputNFTs.map(name => {
  const parsed = parseAssetName(name);
  return parsed?.categoryCode;
});

// Verify all are the same category
const allSameCategory = categories.every(cat => cat === categories[0]);
if (!allSameCategory) {
  throw new Error('All input NFTs must be from the same category');
}

// 2. Build Category Ultimate asset name
const categoryCode = categories[0]!;
const hexId = generateHexId();

const assetName = buildAssetName({
  tier: 'category_ultimate',
  categoryCode,
  id: hexId
});
console.log(assetName); // 'TNFT_V1_SCI_ULT_46fbf442'
```

### Tier 3: Master Ultimate NFT

Complete workflow for forging a Master Ultimate NFT:

```typescript
import { 
  buildAssetName, 
  generateHexId, 
  parseAssetName 
} from './nft-naming';

// 1. Parse input NFTs to verify one from each category
const inputNFTs = [
  'TNFT_V1_ARTS_REG_12b3de7d',
  'TNFT_V1_ENT_REG_46fbf442',
  'TNFT_V1_GEO_REG_0559c272',
  'TNFT_V1_HIST_REG_41871703',
  'TNFT_V1_MYTH_REG_8a9b1c2d',
  'TNFT_V1_NAT_REG_3e4f5a6b',
  'TNFT_V1_SCI_REG_7c8d9e0f',
  'TNFT_V1_SPORT_REG_1a2b3c4d',
  'TNFT_V1_TECH_REG_5e6f7a8b',
  'TNFT_V1_WEIRD_REG_9c0d1e2f'
];

const categories = new Set(
  inputNFTs.map(name => parseAssetName(name)?.categoryCode)
);

// Verify we have all 10 categories
if (categories.size !== 10) {
  throw new Error('Must have one NFT from each of the 10 categories');
}

// 2. Build Master Ultimate asset name (no category code)
const hexId = generateHexId();

const assetName = buildAssetName({
  tier: 'master_ultimate',
  id: hexId
});
console.log(assetName); // 'TNFT_V1_MAST_41871703'
```

### Tier 4: Seasonal Ultimate NFT

Complete workflow for forging a Seasonal Ultimate NFT:

```typescript
import { 
  buildAssetName, 
  generateHexId, 
  getSeasonCode,
  parseSeasonCode 
} from './nft-naming';

// 1. Determine current season
const currentSeason = 'winter';
const seasonNumber = 1;

// 2. Generate season code
const seasonCode = getSeasonCode(currentSeason, seasonNumber); // 'WI1'

// 3. Verify season info
const seasonInfo = parseSeasonCode(seasonCode);
console.log(seasonInfo.name); // 'Winter Season 1'

// 4. Build Seasonal Ultimate asset name
const hexId = generateHexId();

const assetName = buildAssetName({
  tier: 'seasonal_ultimate',
  seasonCode,
  id: hexId
});
console.log(assetName); // 'TNFT_V1_SEAS_WI1_ULT_0559c272'
```

### Parsing and Displaying NFT Information

Complete workflow for parsing and displaying NFT details:

```typescript
import { 
  parseAssetName, 
  getCategorySlug,
  parseSeasonCode 
} from './nft-naming';

function displayNFTInfo(assetName: string) {
  const parsed = parseAssetName(assetName);
  
  if (!parsed) {
    console.log('Invalid asset name');
    return;
  }

  console.log('NFT Information:');
  console.log('- Prefix:', parsed.prefix);
  console.log('- Version:', parsed.version);
  console.log('- Tier:', parsed.tier);
  console.log('- ID:', parsed.id);

  // Display category if present
  if (parsed.categoryCode) {
    const categorySlug = getCategorySlug(parsed.categoryCode);
    console.log('- Category:', categorySlug);
  }

  // Display season if present
  if (parsed.seasonCode) {
    const seasonInfo = parseSeasonCode(parsed.seasonCode);
    console.log('- Season:', seasonInfo.name);
  }

  // Determine tier name
  const tierNames = {
    REG: 'Category NFT',
    ULT: parsed.categoryCode ? 'Category Ultimate' : 'Unknown',
    MAST: 'Master Ultimate',
    SEAS: 'Seasonal Ultimate'
  };
  console.log('- Type:', tierNames[parsed.tier]);
}

// Examples
displayNFTInfo('TNFT_V1_SCI_REG_12b3de7d');
displayNFTInfo('TNFT_V1_HIST_ULT_46fbf442');
displayNFTInfo('TNFT_V1_MAST_41871703');
displayNFTInfo('TNFT_V1_SEAS_WI1_ULT_0559c272');
```

---

## Best Practices

### 1. Always Validate Before Minting

```typescript
const assetName = buildAssetName(params);
if (!validateAssetName(assetName)) {
  throw new Error('Generated invalid asset name');
}
// Proceed with minting
```

### 2. Handle Errors Gracefully

```typescript
try {
  const categoryCode = getCategoryCode(slug);
} catch (error) {
  console.error('Invalid category slug:', slug);
  // Provide fallback or user feedback
}
```

### 3. Use Type Safety

```typescript
import type { CategoryCode, TierType } from './nft-naming';

function mintNFT(tier: TierType, category: CategoryCode) {
  // TypeScript ensures valid values
}
```

### 4. Cache Category Mappings

```typescript
import { CATEGORY_CODE_MAP, CATEGORY_SLUG_MAP } from './category-codes';

// Direct access for performance-critical code
const code = CATEGORY_CODE_MAP['science']; // 'SCI'
```

### 5. Log Asset Name Operations

```typescript
import { setNamingLogger } from './nft-naming';
import { Logger } from './logger';

// Set up logging for monitoring
const logger = new Logger({ module: 'minting-service' });
setNamingLogger(logger);

// All operations will now be logged
```

---

## Migration from Legacy Format

If you have existing NFTs with legacy names, the parser automatically handles them:

```typescript
import { parseAssetName } from './nft-naming';

// Legacy format
const legacy = parseAssetName('quantum-explorer');
console.log(legacy);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'REG',
//   id: 'quantum-explorer'
// }

// New format
const modern = parseAssetName('TNFT_V1_SCI_REG_12b3de7d');
console.log(modern);
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'REG',
//   categoryCode: 'SCI',
//   id: '12b3de7d'
// }
```

---

## Related Documentation

- [NFT System Guide](../../../COMPLETE_NFT_SYSTEM_GUIDE.md) - Complete NFT system documentation
- [Monitoring Guide](./NFT_NAMING_MONITORING.md) - Monitoring and metrics documentation
- [Requirements](../../../.kiro/specs/nft-naming-convention/requirements.md) - Detailed requirements
- [Design](../../../.kiro/specs/nft-naming-convention/design.md) - System design document

---

## Support

For questions or issues with the NFT naming convention:

1. Check the [Requirements](../../../.kiro/specs/nft-naming-convention/requirements.md) document
2. Review the [Design](../../../.kiro/specs/nft-naming-convention/design.md) document
3. Check existing tests for usage examples
4. Consult the [Monitoring Guide](./NFT_NAMING_MONITORING.md) for debugging

---

*Last Updated: November 2025*
*Version: 1.0.0*
