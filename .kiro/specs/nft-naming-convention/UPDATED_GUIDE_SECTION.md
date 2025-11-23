# Updated NFT Naming Convention Section

This document contains the updated "NFT Naming Convention" section to replace in COMPLETE_NFT_SYSTEM_GUIDE.md

---

## NFT Naming Convention

### Overview

TriviaNFT uses a standardized naming convention for on-chain Cardano asset names (token_name). The system generates short, fixed-length, ASCII-only identifiers that are consistent and easy to parse, while maintaining human-friendly display names in metadata and database storage.

**Key Principles:**
- **On-chain asset names** are short, structured identifiers (≤32 bytes)
- **Display names** are human-friendly names stored in metadata and database
- **Asset names** follow the pattern: `TNFT_V1_{...}_{id}`
- **All characters** are uppercase A-Z, 0-9, and underscore only

### Asset Name Format

All NFTs follow this base structure:

```
TNFT_V1_{...}_{id}

Where:
- TNFT = TriviaNFT project prefix
- V1   = Version 1 of the collection
- {...}= Tier-specific information (category, season, etc.)
- {id} = 8-character lowercase hexadecimal unique identifier
```

### Category Codes

The 10 trivia categories are mapped to short codes:

| Category Slug      | Category Code | Category Name          |
|--------------------|---------------|------------------------|
| `arts`             | `ARTS`        | Arts & Literature      |
| `entertainment`    | `ENT`         | Entertainment          |
| `geography`        | `GEO`         | Geography              |
| `history`          | `HIST`        | History                |
| `mythology`        | `MYTH`        | Mythology              |
| `nature`           | `NAT`         | Nature                 |
| `science`          | `SCI`         | Science                |
| `sports`           | `SPORT`       | Sports                 |
| `technology`       | `TECH`        | Technology             |
| `weird-wonderful`  | `WEIRD`       | Weird & Wonderful      |

### Tier Codes

The 4 NFT tiers use these codes:

| Tier Name              | Tier Code | Description                    |
|------------------------|-----------|--------------------------------|
| Category NFT           | `REG`     | Regular tier (Tier 1)          |
| Category Ultimate NFT  | `ULT`     | Ultimate tier (Tier 2)         |
| Master Ultimate NFT    | `MAST`    | Master tier (Tier 3)           |
| Seasonal Ultimate NFT  | `SEAS`    | Seasonal tier (Tier 4)         |

### Season Codes

Seasonal Ultimate NFTs use short season codes:

| Season          | Season Code | Example                    |
|-----------------|-------------|----------------------------|
| Winter Season 1 | `WI1`       | TNFT_V1_SEAS_WI1_ULT_{id}  |
| Spring Season 1 | `SP1`       | TNFT_V1_SEAS_SP1_ULT_{id}  |
| Summer Season 1 | `SU1`       | TNFT_V1_SEAS_SU1_ULT_{id}  |
| Fall Season 1   | `FA1`       | TNFT_V1_SEAS_FA1_ULT_{id}  |
| Winter Season 2 | `WI2`       | TNFT_V1_SEAS_WI2_ULT_{id}  |
| Spring Season 2 | `SP2`       | TNFT_V1_SEAS_SP2_ULT_{id}  |

### Asset Name Patterns by Tier

#### Tier 1: Category NFTs (Regular)

**Pattern:** `TNFT_V1_{CAT}_REG_{id}`

Earned by achieving a perfect 10/10 quiz score in a category.

**Examples:**
```
TNFT_V1_SCI_REG_12b3de7d    (Science Category NFT)
TNFT_V1_ARTS_REG_9c47ab21   (Arts & Literature Category NFT)
TNFT_V1_WEIRD_REG_5b92f3d1  (Weird & Wonderful Category NFT)
TNFT_V1_SPORT_REG_a4c9e8ff  (Sports Category NFT)
TNFT_V1_HIST_REG_3f8d2c1a   (History Category NFT)
```

**Note:** Seasonal Regular NFTs use the same pattern. The seasonal flag is stored in metadata and database, not in the asset name.

---

#### Tier 2: Category Ultimate NFTs

**Pattern:** `TNFT_V1_{CAT}_ULT_{id}`

Forged by burning 10 Regular NFTs from the same category.

**Examples:**
```
TNFT_V1_SCI_ULT_46fbf442    (Science Category Ultimate)
TNFT_V1_HIST_ULT_85d66984   (History Category Ultimate)
TNFT_V1_WEIRD_ULT_331b1c88  (Weird & Wonderful Category Ultimate)
TNFT_V1_TECH_ULT_2f884d93   (Technology Category Ultimate)
TNFT_V1_GEO_ULT_7a9c4e2f    (Geography Category Ultimate)
```

---

#### Tier 3: Master Ultimate NFT

**Pattern:** `TNFT_V1_MAST_{id}`

Forged by burning 10 Regular NFTs, one from each of the 10 categories.

**Examples:**
```
TNFT_V1_MAST_41871703       (Master Ultimate NFT)
TNFT_V1_MAST_8f3d9a2c       (Master Ultimate NFT)
```

**Note:** Master Ultimate NFTs do not include a category code since they represent mastery across all categories.

---

#### Tier 4: Seasonal Ultimate NFTs

**Pattern:** `TNFT_V1_SEAS_{SeasonCode}_ULT_{id}`

Forged by burning 20 Regular NFTs from the same season (2 from each category).

**Examples:**
```
TNFT_V1_SEAS_WI1_ULT_0559c272  (Winter Season 1 Ultimate)
TNFT_V1_SEAS_SU1_ULT_94f77f36  (Summer Season 1 Ultimate)
TNFT_V1_SEAS_SP2_ULT_6d8a3f1e  (Spring Season 2 Ultimate)
TNFT_V1_SEAS_FA1_ULT_2c9f7b4a  (Fall Season 1 Ultimate)
```

---

### Display Names vs Asset Names

**Asset Name (On-Chain):**
- Short, structured identifier
- Stored on Cardano blockchain
- Used for transactions and lookups
- Example: `TNFT_V1_SCI_REG_12b3de7d`

**Display Name (Off-Chain):**
- Human-friendly, descriptive name
- Stored in database and metadata
- Shown to users in UI
- Example: `Quantum Explorer`

**Where Each is Stored:**

| Location           | Asset Name | Display Name |
|--------------------|------------|--------------|
| Blockchain         | ✓          | ✗            |
| CIP-25 Metadata    | ✓          | ✓            |
| Database           | ✓          | ✓            |
| User Interface     | ✗          | ✓            |

---

### Database Schema

#### nft_catalog Table

```sql
CREATE TABLE nft_catalog (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,              -- Legacy field
  display_name VARCHAR(200) NOT NULL,      -- Human-friendly name
  description TEXT,
  s3_art_key VARCHAR(500) NOT NULL,
  s3_meta_key VARCHAR(500) NOT NULL,
  ipfs_cid VARCHAR(100),
  is_minted BOOLEAN DEFAULT false,
  minted_at TIMESTAMPTZ,
  tier VARCHAR(20) DEFAULT 'category',
  attributes JSONB
);

-- Example data
INSERT INTO nft_catalog (display_name, ...) VALUES
  ('Quantum Explorer', ...),
  ('DNA Helix', ...),
  ('Periodic Master', ...);
```

#### categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  category_code VARCHAR(10) NOT NULL UNIQUE,  -- New field
  description TEXT,
  icon VARCHAR(50)
);

-- Example data
INSERT INTO categories (name, slug, category_code) VALUES
  ('Science', 'science', 'SCI'),
  ('History', 'history', 'HIST'),
  ('Geography', 'geography', 'GEO');
```

#### player_nfts Table

```sql
CREATE TABLE player_nfts (
  id UUID PRIMARY KEY,
  stake_key VARCHAR(255) NOT NULL,
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44) UNIQUE,
  token_name VARCHAR(64) NOT NULL,          -- Asset name (e.g., TNFT_V1_SCI_REG_12b3de7d)
  type_code VARCHAR(10),                    -- Tier code (REG, ULT, MAST, SEAS)
  source VARCHAR(20) NOT NULL,              -- 'mint' or 'forge'
  category_id UUID,
  season_id VARCHAR(50),
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  minted_at TIMESTAMPTZ NOT NULL,
  burned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL
);

-- Example data
INSERT INTO player_nfts (token_name, type_code, ...) VALUES
  ('TNFT_V1_SCI_REG_12b3de7d', 'REG', ...),
  ('TNFT_V1_SCI_ULT_46fbf442', 'ULT', ...),
  ('TNFT_V1_MAST_41871703', 'MAST', ...);
```

---

### CIP-25 Metadata Format

#### Category NFT Metadata

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

#### Category Ultimate NFT Metadata

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_SCI_ULT_46fbf442": {
        "name": "Science Category Ultimate",
        "description": "Forged from 10 Science NFTs, representing mastery of scientific knowledge",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "files": [{
          "name": "science-ultimate.png",
          "mediaType": "image/png",
          "src": "ipfs://Qm..."
        }],
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

#### Master Ultimate NFT Metadata

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_MAST_41871703": {
        "name": "Master Ultimate",
        "description": "Forged from 10 NFTs across all categories, representing complete mastery",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "files": [{
          "name": "master-ultimate.png",
          "mediaType": "image/png",
          "src": "ipfs://Qm..."
        }],
        "attributes": {
          "Tier": "master_ultimate",
          "TierCode": "MAST",
          "Rarity": "Epic",
          "AssetName": "TNFT_V1_MAST_41871703",
          "DisplayName": "Master Ultimate"
        }
      }
    }
  }
}
```

#### Seasonal Ultimate NFT Metadata

```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_SEAS_WI1_ULT_0559c272": {
        "name": "Winter Season 1 Ultimate",
        "description": "Forged from 20 seasonal NFTs during Winter Season 1",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
        "files": [{
          "name": "winter-s1-ultimate.png",
          "mediaType": "image/png",
          "src": "ipfs://Qm..."
        }],
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

---

### Minting Transaction Example

```typescript
import { Lucid } from 'lucid-cardano';
import { buildAssetName, getCategoryCode, generateHexId } from './utils/nft-naming';

// Generate asset name
const hexId = generateHexId(); // e.g., "12b3de7d"
const categoryCode = getCategoryCode('science'); // "SCI"
const assetName = buildAssetName({
  tier: 'category',
  categoryCode,
  id: hexId
}); // "TNFT_V1_SCI_REG_12b3de7d"

// Build mint transaction
const tx = await lucid
  .newTx()
  .mintAssets({
    [policyId + assetName]: 1n  // Mint 1 NFT
  })
  .attachMetadata(721, {
    [policyId]: {
      [assetName]: {
        name: "Quantum Explorer",  // Display name
        description: "A Science trivia NFT earned by achieving a perfect score",
        image: "ipfs://Qm...",
        mediaType: "image/png",
        files: [{
          name: "quantum-explorer.png",
          mediaType: "image/png",
          src: "ipfs://Qm..."
        }],
        attributes: {
          Category: "Science",
          CategoryCode: "SCI",
          Tier: "category",
          TierCode: "REG",
          Rarity: "Common",
          AssetName: assetName,
          DisplayName: "Quantum Explorer"
        }
      }
    }
  })
  .complete();

const signed = await tx.sign().complete();
const txHash = await signed.submit();
```

---

### Forging Transaction Example

```typescript
import { buildAssetName, getCategoryCode, generateHexId } from './utils/nft-naming';

// Forge Category Ultimate
const hexId = generateHexId(); // e.g., "46fbf442"
const categoryCode = getCategoryCode('science'); // "SCI"
const ultimateAssetName = buildAssetName({
  tier: 'category_ultimate',
  categoryCode,
  id: hexId
}); // "TNFT_V1_SCI_ULT_46fbf442"

// Build burn transaction (burn 10 Category NFTs)
const burnTx = await lucid
  .newTx()
  .mintAssets({
    [policyId + "TNFT_V1_SCI_REG_12b3de7d"]: -1n,  // Burn NFT 1
    [policyId + "TNFT_V1_SCI_REG_9c47ab21"]: -1n,  // Burn NFT 2
    // ... burn 8 more NFTs
  }, redeemer)
  .complete();

// Build mint transaction (mint Ultimate NFT)
const mintTx = await lucid
  .newTx()
  .mintAssets({
    [policyId + ultimateAssetName]: 1n
  })
  .attachMetadata(721, {
    [policyId]: {
      [ultimateAssetName]: {
        name: "Science Category Ultimate",
        description: "Forged from 10 Science NFTs",
        image: "ipfs://Qm...",
        attributes: {
          Category: "Science",
          CategoryCode: "SCI",
          Tier: "category_ultimate",
          TierCode: "ULT",
          Rarity: "Rare",
          AssetName: ultimateAssetName,
          DisplayName: "Science Category Ultimate"
        }
      }
    }
  })
  .complete();
```

---

### Helper Functions

The system provides utility functions for working with asset names:

#### buildAssetName()

Constructs an asset name from parameters:

```typescript
function buildAssetName(params: {
  tier: 'category' | 'category_ultimate' | 'master_ultimate' | 'seasonal_ultimate';
  categoryCode?: string;
  seasonCode?: string;
  id: string;
}): string;

// Examples
buildAssetName({ tier: 'category', categoryCode: 'SCI', id: '12b3de7d' })
// Returns: "TNFT_V1_SCI_REG_12b3de7d"

buildAssetName({ tier: 'category_ultimate', categoryCode: 'HIST', id: '46fbf442' })
// Returns: "TNFT_V1_HIST_ULT_46fbf442"

buildAssetName({ tier: 'master_ultimate', id: '41871703' })
// Returns: "TNFT_V1_MAST_41871703"

buildAssetName({ tier: 'seasonal_ultimate', seasonCode: 'WI1', id: '0559c272' })
// Returns: "TNFT_V1_SEAS_WI1_ULT_0559c272"
```

#### parseAssetName()

Extracts components from an asset name:

```typescript
function parseAssetName(assetName: string): {
  prefix: string;
  version: string;
  tier: string;
  categoryCode?: string;
  seasonCode?: string;
  id: string;
} | null;

// Examples
parseAssetName('TNFT_V1_SCI_REG_12b3de7d')
// Returns: { prefix: 'TNFT', version: 'V1', tier: 'REG', categoryCode: 'SCI', id: '12b3de7d' }

parseAssetName('TNFT_V1_MAST_41871703')
// Returns: { prefix: 'TNFT', version: 'V1', tier: 'MAST', id: '41871703' }

parseAssetName('INVALID_NAME')
// Returns: null
```

#### validateAssetName()

Validates an asset name format:

```typescript
function validateAssetName(assetName: string): boolean;

// Examples
validateAssetName('TNFT_V1_SCI_REG_12b3de7d')  // true
validateAssetName('TNFT_V1_MAST_41871703')     // true
validateAssetName('INVALID_NAME')              // false
validateAssetName('TNFT_V1_INVALID_REG_123')   // false (invalid category code)
```

#### generateHexId()

Generates a unique 8-character hex ID:

```typescript
function generateHexId(): string;

// Examples
generateHexId()  // "12b3de7d"
generateHexId()  // "46fbf442"
generateHexId()  // "0559c272"
```

---

### Cardano Standards Compliance

#### CIP-14 (Asset Fingerprint)
- Format: `asset1...` (44 characters, base58)
- Unique identifier for each NFT
- Used for lookups and transfers

#### CIP-25 (NFT Metadata Standard)
All TriviaNFT metadata follows the CIP-25 standard as shown in the examples above.

#### CIP-27 (Royalties)
Royalty information is included in NFT metadata:

```json
{
  "royalty_address": "addr_test1...",
  "royalty_rate": 0.025  // 2.5%
}
```

**Environment Variables:**
```bash
ROYALTY_ADDRESS=addr_test1...
ROYALTY_RATE=0.025
```

---

### File Storage Paths

**Category NFTs:**
```
Art:      nft-art/{category}/{descriptive-name}.png
Metadata: nft-metadata/{category}/{descriptive-name}.json

Examples:
- nft-art/science/quantum-explorer.png
- nft-art/history/ancient-scroll.png
- nft-art/geography/mountain-peak.png
```

**Ultimate NFTs:**
```
Art:      nft-art/ultimate/{category}/{category}-ultimate-{n}.png
Metadata: nft-metadata/ultimate/{category}/{category}-ultimate-{n}.json

Examples:
- nft-art/ultimate/science/science-ultimate-1.png
- nft-art/ultimate/history/history-ultimate-1.png
```

**Master NFTs:**
```
Art:      nft-art/ultimate/master-ultimate.png
Metadata: nft-metadata/ultimate/master-ultimate.json
```

**Seasonal NFTs:**
```
Art:      nft-art/ultimate/{season}-seasonal.png
Metadata: nft-metadata/ultimate/{season}-seasonal.json

Examples:
- nft-art/ultimate/winter-s1-seasonal.png
- nft-art/ultimate/summer-s1-seasonal.png
```

**Note:** File paths remain unchanged. Only the on-chain asset_name (token_name) follows the new convention.

---

### Summary

**Asset Name Structure:**
- Tier 1 (Category): `TNFT_V1_{CAT}_REG_{id}`
- Tier 2 (Category Ultimate): `TNFT_V1_{CAT}_ULT_{id}`
- Tier 3 (Master Ultimate): `TNFT_V1_MAST_{id}`
- Tier 4 (Seasonal Ultimate): `TNFT_V1_SEAS_{SeasonCode}_ULT_{id}`

**Key Points:**
- Asset names are short, structured, on-chain identifiers
- Display names are human-friendly, stored in metadata/database
- All asset names start with `TNFT_V1_`
- All asset names end with an 8-character hex ID
- Category codes map 10 categories to 3-5 character codes
- Tier codes identify the NFT rarity level
- Season codes identify which season a Seasonal Ultimate represents

---
