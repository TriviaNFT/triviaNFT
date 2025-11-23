# Backward Compatibility Implementation

## Overview

Task 12 has been completed, adding backward compatibility support for legacy token name formats in the NFT naming system.

## Changes Made

### 1. Updated `parseAssetName()` Function

The main parsing function now supports both formats:
- **New Format**: `TNFT_V1_{...}_{id}` (standardized format)
- **Legacy Format**: Kebab-case descriptive names like `quantum-explorer`, `dna-helix`, etc.

### 2. Added `parseLegacyFormat()` Function

A new exported function that specifically handles legacy format names:
- Accepts kebab-case names (lowercase letters, numbers, hyphens)
- Minimum length: 5 characters
- Maximum length: 64 characters
- Returns a basic `AssetNameComponents` structure with:
  - `prefix`: 'TNFT'
  - `version`: 'V1'
  - `tier`: 'REG' (default for legacy)
  - `id`: The full legacy name
  - No `categoryCode` or `seasonCode` (cannot be determined from legacy names)

### 3. Added `parseNewFormat()` Function

An internal function that handles the new standardized format parsing. This is called first by `parseAssetName()` before falling back to legacy format.

### 4. Updated `validateAssetName()` Function

The validation function now accepts both formats:
- New format names (with TNFT_V1_ prefix)
- Legacy format names (kebab-case)

### 5. Fallback Logic

The parsing follows this priority:
1. Try to parse as new format first
2. If that fails, try to parse as legacy format
3. If both fail, return null

## Legacy Format Characteristics

Legacy format names are identified by:
- No `TNFT_V1_` prefix
- Lowercase letters, numbers, and hyphens only
- Length between 5 and 64 characters
- Examples: `quantum-explorer`, `dna-helix`, `ancient-scroll`

## Database Compatibility

No database query changes were required because:
- All queries use `asset_fingerprint` as the primary identifier
- `token_name` is only stored and retrieved, not used for lookups
- Both formats can coexist in the database

## Testing

Comprehensive tests were added:
- Unit tests for `parseLegacyFormat()`
- Unit tests for fallback behavior
- Property-based tests for legacy format validation
- All 29 tests pass successfully

## Usage Examples

```typescript
// New format
const newFormat = parseAssetName('TNFT_V1_SCI_REG_12b3de7d');
// Returns: { prefix: 'TNFT', version: 'V1', tier: 'REG', categoryCode: 'SCI', id: '12b3de7d' }

// Legacy format
const legacyFormat = parseAssetName('quantum-explorer');
// Returns: { prefix: 'TNFT', version: 'V1', tier: 'REG', id: 'quantum-explorer' }

// Validation works for both
validateAssetName('TNFT_V1_SCI_REG_12b3de7d'); // true
validateAssetName('quantum-explorer'); // true
```

## Requirements Validated

This implementation satisfies:
- **Requirement 1.5**: Parse asset names and extract components (supports both formats)
- **Requirement 6.6**: Parse function handles both valid new format and legacy format
- **Requirement 6.7**: Parse function returns null for invalid names

## Migration Strategy

The system now supports dual format operation:
- New NFTs use the standardized format
- Existing NFTs with legacy names continue to work
- No breaking changes to existing functionality
- Gradual transition over time as new NFTs are minted
