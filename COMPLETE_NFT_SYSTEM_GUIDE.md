# Complete NFT System Guide
**TriviaNFT Platform - Full Minting, Forging & Category Information**  
**Last Updated:** November 22, 2025

---

## Table of Contents
1. [Categories Overview](#categories-overview)
2. [NFT Tiers](#nft-tiers)
3. [How to Earn NFTs (Minting)](#how-to-earn-nfts-minting)
4. [How to Forge Ultimate NFTs (Burning)](#how-to-forge-ultimate-nfts-burning)
5. [Complete NFT Lifecycle](#complete-nft-lifecycle)
6. [Technical Details](#technical-details)

---

## Categories Overview

TriviaNFT has **10 trivia categories**, each with its own themed NFT collection:

### 1. Science 🔬
**Slug:** `science`  
**Description:** Questions about physics, chemistry, biology, and astronomy  
**Example NFTs:** Quantum Explorer, DNA Helix, Periodic Master, Gravity Wave, Atomic Fusion

### 2. History 📜
**Slug:** `history`  
**Description:** Questions about world history and historical events  
**Example NFTs:** Ancient Scroll, Medieval Knight, Renaissance Mind, Time Traveler, Historical Monument

### 3. Geography 🌍
**Slug:** `geography`  
**Description:** Questions about countries, cities, and physical geography  
**Example NFTs:** Mountain Peak, Ocean Deep, Desert Wanderer, Rainforest Guardian, Arctic Explorer

### 4. Sports ⚽
**Slug:** `sports`  
**Description:** Questions about various sports and athletes  
**Example NFTs:** Champion Trophy, Gold Medalist, Record Breaker, Team Captain, MVP Award

### 5. Arts & Literature 🎨
**Slug:** `arts`  
**Description:** Questions about visual arts, music, performing arts, and literature  
**Example NFTs:** Masterpiece Canvas, Sculpture Divine, Abstract Vision, Epic Novel, Poetry Master

### 6. Entertainment 🎬
**Slug:** `entertainment`  
**Description:** Questions about movies, TV shows, and pop culture  
**Example NFTs:** Blockbuster Star, Silver Screen, Box Office Hit, Award Winner, Pop Culture Icon

### 7. Technology 💻
**Slug:** `technology`  
**Description:** Questions about computers, internet, and modern technology  
**Example NFTs:** Digital Pioneer, Code Master, Innovation Hub, Tech Visionary, AI Architect

### 8. Weird & Wonderful 🌟
**Slug:** `weird-wonderful`  
**Description:** Questions about strange, surprising, and mind-blowing facts from all topics  
**Example NFTs:** Cosmic Oddity, Strange Phenomenon, Bizarre Creature, Odd Discovery

### 9. Mythology ⚡
**Slug:** `mythology`  
**Description:** Questions about myths, legends, and ancient deities  
**Example NFTs:** Zeus Thunder, Odin Wisdom, Greek God, Norse Warrior, Divine Pantheon

### 10. Nature 🦁
**Slug:** `nature`  
**Description:** Questions about wildlife, ecosystems, and the natural world  
**Example NFTs:** Forest Spirit, Ocean Wave, Wildlife Safari, Rainforest Life, Apex Predator

---

## NFT Tiers

TriviaNFT has **4 tiers** of NFTs, each with increasing rarity and value:

### Tier 1: Category NFTs (Common) 🎯
**How to Get:** Achieve a perfect score (10/10) in any trivia category  
**Quantity:** ~30-40 unique designs per category  
**Total Supply:** Limited (each design can only be minted once)  
**Source:** `mint`  
**Naming:** `nft-art/{category}/{descriptive-name}.png`

**Examples:**
- Science: Quantum Explorer, DNA Helix, Periodic Master
- History: Ancient Scroll, Medieval Knight
- Geography: Mountain Peak, Ocean Deep

---

### Tier 2: Category Ultimate NFTs (Rare) 🏅
**How to Get:** Forge by burning 10 Category NFTs from the **same category**  
**Quantity:** Limited unique designs per category  
**Source:** `forge`  
**Naming:** `nft-art/ultimate/{category}/{category}-ultimate-{n}.png`

**Requirements:**
- Burn exactly 10 Category NFTs
- All from the same category (e.g., 10 Science NFTs)
- All must be tier "category"

**Examples:**
- Science Category Ultimate
- History Category Ultimate
- Geography Category Ultimate

---

### Tier 3: Master Ultimate NFT (Epic) 🏆
**How to Get:** Forge by burning 10 Category NFTs from **10 different categories**  
**Quantity:** Extremely limited  
**Source:** `forge`  
**Naming:** `nft-art/ultimate/{category}-master.png`

**Requirements:**
- Burn exactly 10 Category NFTs
- 1 NFT from each of the 10 categories
- Demonstrates mastery across all knowledge domains

**Example:**
- Master Ultimate NFT (cross-category achievement)

---

### Tier 4: Seasonal Ultimate NFT (Legendary) 👑
**How to Get:** Forge by burning 2 Category NFTs from **each of the 10 categories** during a season  
**Quantity:** Ultra-rare (time-limited)  
**Source:** `forge`  
**Naming:** `nft-art/ultimate/{season}-seasonal.png`

**Requirements:**
- Burn 20 Category NFTs total (2 from each category)
- All NFTs must be from the current season
- Must forge during season or within 7-day grace period
- Seasons last 3 months

**Examples:**
- Winter Season 1 Ultimate
- Spring Season 2 Ultimate

---

## How to Earn NFTs (Minting)

### The Trivia Game Flow

```
1. Connect Wallet (or play as guest)
         ↓
2. Choose a Category
         ↓
3. Answer 10 Questions
         ↓
4. Get Perfect Score (10/10)
         ↓
5. Earn Eligibility to Mint NFT
         ↓
6. Preview Your NFT
         ↓
7. Mint NFT to Your Wallet
         ↓
8. NFT Appears in Your Collection
```

---

### Step-by-Step Minting Process

#### Step 1: Play Trivia
- Choose one of 10 categories
- Answer 10 multiple-choice questions
- Must get **all 10 correct** (perfect score)

#### Step 2: Earn Eligibility
When you achieve a perfect score:
- System creates an **eligibility** record
- Eligibility expires after:
  - **1 hour** for connected wallet users
  - **25 minutes** for guest users
- One eligibility = one NFT mint

#### Step 3: NFT Selection
- System randomly selects an available NFT from the category
- NFT is **reserved** for you (won't be given to someone else)
- You see a preview of your NFT

#### Step 4: Mint Transaction
**For Connected Wallet Users:**
```
Backend builds mint transaction
         ↓
Signs with policy key
         ↓
Submits to Cardano blockchain
         ↓
Waits for confirmation (~2-5 minutes)
         ↓
NFT appears in your wallet
```

**For Guest Users:**
- Must connect wallet to mint
- Eligibility saved until expiration
- Can connect wallet later and mint

#### Step 5: Database Records
```sql
-- Eligibility marked as "used"
UPDATE eligibilities SET status = 'used', used_at = NOW()

-- Mint operation recorded with asset name
INSERT INTO mints (
  eligibility_id, catalog_id, player_id, stake_key, 
  status, tx_hash, token_name, ...
) VALUES (
  '...', '...', '...', 'stake1...',
  'confirmed', 'abc123...', 'TNFT_V1_SCI_REG_12b3de7d', ...
)

-- NFT catalog item marked as minted
UPDATE nft_catalog SET is_minted = true, minted_at = NOW()

-- Player NFT record created with asset name and type code
INSERT INTO player_nfts (
  stake_key, policy_id, asset_fingerprint, token_name,
  tier, type_code, source, metadata, ...
) VALUES (
  'stake1...', 'policy123...', 'asset1abc...',
  'TNFT_V1_SCI_REG_12b3de7d', 'category', 'REG', 'mint',
  '{"name": "Quantum Explorer", ...}', ...
)
```

---

### Minting Rules & Limits

**Eligibility Expiration:**
- Connected wallet: 1 hour
- Guest: 25 minutes
- After expiration, eligibility becomes "expired" (cannot mint)

**NFT Availability:**
- Each NFT design can only be minted once
- When all NFTs in a category are minted, no more can be earned
- System tracks `is_minted` flag in `nft_catalog` table

**Multiple Eligibilities:**
- You can have multiple active eligibilities
- Each perfect score = 1 new eligibility
- Can mint them all before they expire

**Seasons:**
- NFTs minted during a season are tagged with `season_id`
- Seasonal NFTs are required for Seasonal Ultimate forging
- Seasons last 3 months

---

### Minting on Cardano Blockchain

**Transaction Structure:**
```typescript
// Using Lucid library
import { buildAssetName, getCategoryCode, generateHexId } from '@/utils/nft-naming';

// Generate asset name
const hexId = generateHexId(); // e.g., "12b3de7d"
const categoryCode = getCategoryCode('science'); // "SCI"
const assetName = buildAssetName({
  tier: 'category',
  categoryCode,
  id: hexId
}); // Result: "TNFT_V1_SCI_REG_12b3de7d"

const tx = await lucid
  .newTx()
  .mintAssets({
    [policyId + assetName]: 1n  // Mint 1 NFT
  })
  .attachMetadata(721, {  // CIP-25 NFT metadata standard
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
          AssetName: "TNFT_V1_SCI_REG_12b3de7d",
          DisplayName: "Quantum Explorer"
        }
      }
    }
  })
  .complete();

const signed = await tx.sign().complete();
const txHash = await signed.submit();
```

**Policy ID:**
- All TriviaNFT NFTs share the same policy ID
- Policy keys held by backend (centralized minting)
- Stored in environment variable: `POLICY_ID`

**Asset Fingerprint:**
- CIP-14 format (44 characters)
- Unique identifier for each NFT
- Format: `asset1...` (base58 encoded)

**Token Name (Asset Name):**
- Format: `TNFT_V1_{...}_{id}` (see NFT Naming Convention section)
- Max 32 bytes (ASCII only: A-Z, 0-9, underscore)
- Stored on-chain as the asset identifier
- Examples:
  - Category: `TNFT_V1_SCI_REG_12b3de7d`
  - Category Ultimate: `TNFT_V1_SCI_ULT_46fbf442`
  - Master Ultimate: `TNFT_V1_MAST_41871703`
  - Seasonal Ultimate: `TNFT_V1_SEAS_WI1_ULT_0559c272`

---

## How to Forge Ultimate NFTs (Burning)

### The Three Forging Paths

```
Category NFTs (Tier 1)
         ↓
    ┌────┴────┬────────────┬──────────────┐
    ↓         ↓            ↓              ↓
Category   Master      Seasonal      Keep & Collect
Ultimate   Ultimate    Ultimate
(Tier 2)   (Tier 3)    (Tier 4)
```

---

### Forging Type 1: Category Ultimate 🎯

**What You Need:**
- 10 Category NFTs from the **same category**

**What You Get:**
- 1 Category Ultimate NFT for that category

**Example:**
```
Burn:
✗ Quantum Explorer (Science)
✗ DNA Helix (Science)
✗ Periodic Master (Science)
✗ Gravity Wave (Science)
✗ Atomic Fusion (Science)
✗ Cosmic Ray (Science)
✗ Neural Network (Science)
✗ Photon Beam (Science)
✗ Electron Cloud (Science)
✗ Molecular Bond (Science)

Get:
✓ Science Category Ultimate NFT
```

**Strategy:**
- You can forge one Category Ultimate per category
- Total possible: 10 Category Ultimates (one for each category)
- Choose which 10 NFTs to burn (keep your favorites!)

---

### Forging Type 2: Master Ultimate 🏆

**What You Need:**
- 10 Category NFTs from **10 different categories** (1 from each)

**What You Get:**
- 1 Master Ultimate NFT (the ultimate achievement!)

**Example:**
```
Burn:
✗ Quantum Explorer (Science)
✗ Ancient Scroll (History)
✗ Mountain Peak (Geography)
✗ Champion Trophy (Sports)
✗ Masterpiece Canvas (Arts)
✗ Blockbuster Star (Entertainment)
✗ Digital Pioneer (Technology)
✗ Cosmic Oddity (Weird & Wonderful)
✗ Zeus Thunder (Mythology)
✗ Forest Spirit (Nature)

Get:
✓ Master Ultimate NFT
```

**Strategy:**
- Demonstrates mastery across all knowledge domains
- Hardest to achieve if you're missing categories
- Most prestigious achievement

---

### Forging Type 3: Seasonal Ultimate 👑

**What You Need:**
- 2 Category NFTs from **each of the 10 categories** (20 total)
- All NFTs must be from the **current season**

**What You Get:**
- 1 Seasonal Ultimate NFT (season-specific, ultra-rare)

**Example:**
```
Burn (20 NFTs total):
✗ 2 Science NFTs (from Winter Season 1)
✗ 2 History NFTs (from Winter Season 1)
✗ 2 Geography NFTs (from Winter Season 1)
✗ 2 Sports NFTs (from Winter Season 1)
✗ 2 Arts NFTs (from Winter Season 1)
✗ 2 Entertainment NFTs (from Winter Season 1)
✗ 2 Technology NFTs (from Winter Season 1)
✗ 2 Weird & Wonderful NFTs (from Winter Season 1)
✗ 2 Mythology NFTs (from Winter Season 1)
✗ 2 Nature NFTs (from Winter Season 1)

Get:
✓ Winter Season 1 Ultimate NFT
```

**Time Constraints:**
- Must forge during the season (3 months)
- OR within 7-day grace period after season ends
- After grace period, seasonal forging is locked

**Strategy:**
- Most expensive forge (20 NFTs)
- Time-limited opportunity
- Rarest and most valuable Ultimate NFT

---

### The Forging Workflow (Technical)

#### Step 1: Check Your Progress
```
GET /forge/progress

Response:
{
  "progress": [
    {
      "type": "category",
      "categoryId": "science",
      "required": 10,
      "current": 12,
      "nfts": [...],
      "canForge": true
    },
    {
      "type": "master",
      "required": 10,
      "current": 8,
      "nfts": [...],
      "canForge": false
    },
    {
      "type": "season",
      "seasonId": "winter-s1",
      "required": 10,
      "current": 7,
      "nfts": [...],
      "canForge": false
    }
  ]
}
```

#### Step 2: Initiate Forge
```
POST /forge/category
{
  "type": "category",
  "categoryId": "science",
  "inputFingerprints": [
    "asset1abc...",
    "asset1def...",
    // ... 10 total
  ]
}

Response:
{
  "forgeOperation": {
    "id": "forge-abc-123",
    "type": "category",
    "stakeKey": "stake1...",
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Step 3: AWS Step Functions Workflow

**Phase A: Burn NFTs (2-5 minutes)**
```
1. Validate Ownership
   - Check database: player owns all NFTs
   - Check blockchain: NFTs exist in wallet
   
2. Build Burn Transaction
   - Use Lucid library
   - Mint -1 of each NFT (negative = burn)
   
3. Sign Burn Transaction
   - Backend signs with policy key
   
4. Submit Burn Transaction
   - Submit to Cardano via Blockfrost
   - Get transaction hash
   
5. Wait for Burn Confirmation
   - Poll blockchain every 30 seconds
   - Wait for 1+ confirmations
```

**Phase B: Mint Ultimate NFT (2-5 minutes)**
```
6. Build Mint Ultimate Transaction
   - Generate Ultimate NFT metadata
   - Create mint transaction (mint +1)
   
7. Sign Mint Transaction
   - Backend signs with policy key
   
8. Submit Mint Transaction
   - Submit to Cardano
   - Get transaction hash
   
9. Wait for Mint Confirmation
   - Poll blockchain
   - Wait for confirmation
```

**Phase C: Update Database**
```
10. Update Forge Record
    - Mark forge_operations as "confirmed"
    - Record both transaction hashes
    - Mark input NFTs as "burned"
    - Create new Ultimate NFT record
```

#### Step 4: Check Status
```
GET /forge/forge-abc-123/status

Response:
{
  "forgeOperation": {
    "id": "forge-abc-123",
    "type": "category",
    "status": "confirmed",
    "burnTxHash": "abc123...",
    "mintTxHash": "def456...",
    "outputAssetFingerprint": "asset1xyz...",
    "createdAt": "2025-01-01T00:00:00Z",
    "confirmedAt": "2025-01-01T00:08:32Z"
  },
  "ultimateNFT": {
    "id": "nft-uuid",
    "assetFingerprint": "asset1xyz...",
    "tokenName": "TNFT_V1_SCI_ULT_46fbf442",
    "tier": "ultimate",
    "typeCode": "ULT",
    "metadata": {
      "name": "Science Category Ultimate",
      "description": "Forged from 10 Science NFTs",
      "image": "ipfs://...",
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
```

---

### Burning on Cardano Blockchain

**How Burning Works:**
On Cardano, burning is achieved by **minting with a negative quantity**:

```typescript
// Burn transaction
const burnTx = await lucid
  .newTx()
  .mintAssets({
    [policyId + "TNFT_V1_SCI_REG_12b3de7d"]: -1n,  // Burn NFT 1
    [policyId + "TNFT_V1_SCI_REG_a4f8c921"]: -1n,  // Burn NFT 2
    [policyId + "TNFT_V1_SCI_REG_7d3e9b2f"]: -1n,  // Burn NFT 3
    // ... burn all 10 NFTs
  }, redeemer)
  .complete();
```

The negative quantity (`-1n`) permanently removes the NFT from circulation.

**Redeemer:**
- Required by the minting policy script
- Proves authorization to burn
- Backend provides the redeemer

---

### Forging Rules & Constraints

**Ownership Validation:**
- Must own all NFTs in your wallet
- Verified both in database and on-chain
- Cannot forge with NFTs you don't own

**Tier Restrictions:**
- Can only burn "category" tier NFTs
- Cannot burn Ultimate NFTs to create higher tiers (not currently supported)

**Irreversibility:**
- Once initiated, forge cannot be cancelled
- Burned NFTs are gone forever
- Choose carefully!

**Failure Scenarios:**
- If burn fails: NFTs remain in wallet, can retry
- If burn succeeds but mint fails: NFTs are lost (requires support)
- If mint succeeds but database update fails: Eventually consistent

**Time to Complete:**
- Total: 5-10 minutes
- Can close browser, continues in background
- Poll status with forgeId

---

## Complete NFT Lifecycle

### Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT LIFECYCLE                             │
└─────────────────────────────────────────────────────────────┘

1. CREATION (NFT Catalog)
   ↓
   NFT designs created and uploaded to S3/IPFS
   Metadata stored in nft_catalog table
   Status: is_minted = false

2. EARNING (Eligibility)
   ↓
   Player achieves perfect score (10/10)
   Eligibility created (expires in 1 hour / 25 min)
   NFT reserved for player

3. MINTING (Blockchain)
   ↓
   Transaction built and signed
   Submitted to Cardano blockchain
   NFT minted to player's wallet
   Status: is_minted = true

4. OWNERSHIP (Player NFTs)
   ↓
   NFT recorded in player_nfts table
   Status: confirmed
   Source: mint
   Tier: category

5. COLLECTION (Player Wallet)
   ↓
   Player owns and displays NFT
   Can view in wallet or marketplace
   Tracked by stake_key

6. FORGING (Burning)
   ↓
   Player burns 10 NFTs
   Status: burned
   burned_at timestamp set

7. ULTIMATE CREATION (Forge)
   ↓
   New Ultimate NFT minted
   Source: forge
   Tier: ultimate/master/seasonal

8. ULTIMATE OWNERSHIP
   ↓
   Ultimate NFT in player's wallet
   Higher tier, more valuable
   Can be displayed/traded
```

---

### Database Tables

#### nft_catalog
Stores all available NFT designs:
```sql
CREATE TABLE nft_catalog (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,  -- Legacy field
  display_name VARCHAR(200),   -- Human-friendly name (e.g., "Quantum Explorer")
  description TEXT,
  s3_art_key VARCHAR(500) NOT NULL,
  s3_meta_key VARCHAR(500) NOT NULL,
  ipfs_cid VARCHAR(100),
  is_minted BOOLEAN DEFAULT false,
  minted_at TIMESTAMPTZ,
  tier VARCHAR(20) DEFAULT 'category',
  attributes JSONB
);

-- display_name stores the human-friendly NFT name
-- name is kept for backward compatibility
```

#### categories
Stores trivia categories:
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category_code VARCHAR(10) NOT NULL UNIQUE,  -- Short code (e.g., "SCI", "HIST")
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_categories_code ON categories(category_code);

-- category_code is used in asset names for compact on-chain representation
```

#### eligibilities
Tracks earned rights to mint:
```sql
CREATE TABLE eligibilities (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  category_id UUID,
  season_id VARCHAR(50),
  player_id UUID NOT NULL,
  stake_key VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  session_id UUID,
  used_at TIMESTAMPTZ
);
```

#### mints
Records minting operations:
```sql
CREATE TABLE mints (
  id UUID PRIMARY KEY,
  eligibility_id UUID NOT NULL,
  catalog_id UUID NOT NULL,
  player_id UUID NOT NULL,
  stake_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(64),
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44),
  token_name VARCHAR(64),  -- Stores asset name (e.g., "TNFT_V1_SCI_REG_12b3de7d")
  ipfs_cid VARCHAR(100),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- token_name stores the on-chain asset name following the TNFT_V1 format
```

#### player_nfts
Tracks all NFTs owned by players:
```sql
CREATE TABLE player_nfts (
  id UUID PRIMARY KEY,
  stake_key VARCHAR(255) NOT NULL,
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44) UNIQUE,
  token_name VARCHAR(64) NOT NULL,  -- Asset name (e.g., "TNFT_V1_SCI_REG_12b3de7d")
  source VARCHAR(20) NOT NULL,      -- 'mint' or 'forge'
  category_id UUID,
  season_id VARCHAR(50),
  tier VARCHAR(20) NOT NULL,        -- 'category', 'ultimate', 'master', 'seasonal'
  type_code VARCHAR(10),            -- 'REG', 'ULT', 'MAST', 'SEAS' (for quick filtering)
  status VARCHAR(20) DEFAULT 'confirmed',  -- 'confirmed', 'burned', 'transferred'
  minted_at TIMESTAMPTZ NOT NULL,
  burned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL
);

-- token_name stores the on-chain asset name
-- type_code provides quick tier identification without parsing token_name
```

#### forge_operations
Tracks forging operations:
```sql
CREATE TABLE forge_operations (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL,  -- 'category', 'master', 'season'
  stake_key VARCHAR(255) NOT NULL,
  category_id UUID,
  season_id VARCHAR(50),
  input_fingerprints JSONB NOT NULL,
  burn_tx_hash VARCHAR(64),
  mint_tx_hash VARCHAR(64),
  output_asset_fingerprint VARCHAR(44),
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
```

---

## Technical Details

### NFT Naming Convention

TriviaNFT uses a standardized naming convention for on-chain Cardano asset names (token_name). The system separates **asset names** (short, fixed-length on-chain identifiers) from **display names** (human-friendly names in metadata and database).

#### Asset Name Format

All NFT asset names follow this pattern:
```
TNFT_V1_{...}_{id}
```

Where:
- `TNFT` = Project prefix (TriviaNFT)
- `V1` = Version number
- `{...}` = Tier-specific information (category code, tier code, season code)
- `{id}` = 8-character lowercase hexadecimal unique identifier

**Character Set:** A-Z, 0-9, underscore only (ASCII)  
**Max Length:** 32 bytes

#### Category Code Mapping

| Category Slug | Category Code | Description |
|--------------|---------------|-------------|
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

#### Tier Code Mapping

| Tier Name | Tier Code | Description |
|-----------|-----------|-------------|
| Category NFT | `REG` | Regular/Category tier (Tier 1) |
| Category Ultimate | `ULT` | Ultimate tier (Tier 2) |
| Master Ultimate | `MAST` | Master tier (Tier 3) |
| Seasonal Ultimate | `SEAS` | Seasonal tier (Tier 4) |

#### Season Code Format

| Season | Code | Example |
|--------|------|---------|
| Winter Season 1 | `WI1` | First winter season |
| Spring Season 1 | `SP1` | First spring season |
| Summer Season 1 | `SU1` | First summer season |
| Fall Season 1 | `FA1` | First fall season |
| Winter Season 2 | `WI2` | Second winter season |
| ... | ... | Pattern continues |

#### Asset Name Patterns by Tier

**Tier 1: Category NFT**
```
Format: TNFT_V1_{CAT}_REG_{id}

Examples:
- TNFT_V1_SCI_REG_12b3de7d
- TNFT_V1_HIST_REG_a4f8c921
- TNFT_V1_GEO_REG_7d3e9b2f
```

**Tier 2: Category Ultimate NFT**
```
Format: TNFT_V1_{CAT}_ULT_{id}

Examples:
- TNFT_V1_SCI_ULT_46fbf442
- TNFT_V1_HIST_ULT_8c2d1a93
- TNFT_V1_GEO_ULT_f1e4b7c6
```

**Tier 3: Master Ultimate NFT**
```
Format: TNFT_V1_MAST_{id}

Examples:
- TNFT_V1_MAST_41871703
- TNFT_V1_MAST_9f2c8d4a
```

**Tier 4: Seasonal Ultimate NFT**
```
Format: TNFT_V1_SEAS_{SeasonCode}_ULT_{id}

Examples:
- TNFT_V1_SEAS_WI1_ULT_0559c272
- TNFT_V1_SEAS_SP1_ULT_3a7f9e1d
- TNFT_V1_SEAS_SU1_ULT_b8c4d2f7
```

#### Asset Name vs Display Name

**Asset Name (token_name):**
- Stored on-chain in Cardano blockchain
- Short, fixed-length identifier (max 32 bytes)
- Example: `TNFT_V1_SCI_REG_12b3de7d`
- Used for blockchain transactions and lookups

**Display Name:**
- Stored in database (`nft_catalog.display_name`)
- Stored in CIP-25 metadata (`name` field)
- Human-friendly, descriptive name
- Example: `Quantum Explorer`
- Used for UI display and user experience

#### File Naming (S3/IPFS)

**Category NFTs:**
```
Art: nft-art/{category}/{descriptive-name}.png
Metadata: nft-metadata/{category}/{descriptive-name}.json

Examples:
- nft-art/science/quantum-explorer.png
- nft-art/history/ancient-scroll.png
- nft-art/geography/mountain-peak.png
```

**Ultimate NFTs:**
```
Art: nft-art/ultimate/{category}/{category}-ultimate-{n}.png
Metadata: nft-metadata/ultimate/{category}/{category}-ultimate-{n}.json

Examples:
- nft-art/ultimate/science/science-ultimate-1.png
- nft-art/ultimate/history/history-ultimate-1.png
```

**Master NFTs:**
```
Art: nft-art/ultimate/{category}-master.png
Metadata: nft-metadata/ultimate/{category}-master.json
```

**Seasonal NFTs:**
```
Art: nft-art/ultimate/{season}-seasonal.png
Metadata: nft-metadata/ultimate/{season}-seasonal.json
```

---

### Cardano Standards

**CIP-25 (NFT Metadata Standard):**

**Category NFT Example:**
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

**Category Ultimate NFT Example:**
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

**Master Ultimate NFT Example:**
```json
{
  "721": {
    "{policy_id}": {
      "TNFT_V1_MAST_41871703": {
        "name": "Master Ultimate",
        "description": "Forged from 10 Category NFTs across all categories, representing complete mastery",
        "image": "ipfs://Qm...",
        "mediaType": "image/png",
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

**Seasonal Ultimate NFT Example:**
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

**CIP-14 (Asset Fingerprint):**
- Format: `asset1...` (44 characters, base58)
- Unique identifier for each NFT
- Used for lookups and transfers

**CIP-27 (Royalties):**
```json
{
  "royalty_address": "addr_test1...",
  "royalty_rate": 0.025  // 2.5%
}
```

---

### Naming Utility Functions

The system provides utility functions for working with asset names:

**Building Asset Names:**
```typescript
import { buildAssetName, getCategoryCode, generateHexId } from '@/utils/nft-naming';

// Category NFT
const categoryAssetName = buildAssetName({
  tier: 'category',
  categoryCode: getCategoryCode('science'),
  id: generateHexId()
});
// Result: "TNFT_V1_SCI_REG_12b3de7d"

// Category Ultimate NFT
const ultimateAssetName = buildAssetName({
  tier: 'category_ultimate',
  categoryCode: getCategoryCode('history'),
  id: generateHexId()
});
// Result: "TNFT_V1_HIST_ULT_a4f8c921"

// Master Ultimate NFT
const masterAssetName = buildAssetName({
  tier: 'master_ultimate',
  id: generateHexId()
});
// Result: "TNFT_V1_MAST_41871703"

// Seasonal Ultimate NFT
const seasonalAssetName = buildAssetName({
  tier: 'seasonal_ultimate',
  seasonCode: 'WI1',
  id: generateHexId()
});
// Result: "TNFT_V1_SEAS_WI1_ULT_0559c272"
```

**Parsing Asset Names:**
```typescript
import { parseAssetName } from '@/utils/nft-naming';

const parsed = parseAssetName('TNFT_V1_SCI_REG_12b3de7d');
// Result:
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'REG',
//   categoryCode: 'SCI',
//   id: '12b3de7d'
// }

const parsedSeasonal = parseAssetName('TNFT_V1_SEAS_WI1_ULT_0559c272');
// Result:
// {
//   prefix: 'TNFT',
//   version: 'V1',
//   tier: 'SEAS',
//   seasonCode: 'WI1',
//   id: '0559c272'
// }
```

**Validating Asset Names:**
```typescript
import { validateAssetName } from '@/utils/nft-naming';

const isValid = validateAssetName('TNFT_V1_SCI_REG_12b3de7d');
// Result: true

const isInvalid = validateAssetName('INVALID_NAME');
// Result: false (or throws AssetNameValidationError)
```

**Category Code Mapping:**
```typescript
import { getCategoryCode, getCategorySlug } from '@/utils/category-codes';

const code = getCategoryCode('science');
// Result: "SCI"

const slug = getCategorySlug('SCI');
// Result: "science"
```

**Season Code Utilities:**
```typescript
import { getSeasonCode, parseSeasonCode } from '@/utils/season-codes';

const seasonCode = getSeasonCode('winter-s1');
// Result: "WI1"

const seasonInfo = parseSeasonCode('WI1');
// Result:
// {
//   code: 'WI1',
//   name: 'Winter Season 1',
//   season: 'winter',
//   year: 1
// }
```

---

### Configuration (AWS AppConfig)

**Game Settings:**
```json
{
  "eligibility": {
    "connectedWindowMinutes": 60,
    "guestWindowMinutes": 25
  },
  "forging": {
    "categoryUltimateCount": 10,
    "masterUltimateCount": 10,
    "seasonalUltimateCount": 2,
    "seasonGraceDays": 7
  }
}
```

---

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# Blockchain
BLOCKFROST_PROJECT_ID=preprod...
BLOCKFROST_IPFS_PROJECT_ID=ipfs...
CARDANO_NETWORK=preprod

# Wallet
PAYMENT_ADDRESS=addr_test1...
WALLET_SEED_PHRASE=word1 word2 ... word24

# NFT Policy
POLICY_ID=...

# Royalties
ROYALTY_ADDRESS=addr_test1...
ROYALTY_RATE=0.025

# Testing
MINT_TO_BACKEND_WALLET=false
```

---

### API Endpoints Summary

**Minting:**
- `POST /sessions/start` - Start trivia session
- `POST /sessions/{sessionId}/answer` - Submit answer
- `POST /sessions/{sessionId}/complete` - Complete session
- `GET /eligibilities` - Get player's eligibilities
- `POST /mint` - Mint NFT from eligibility

**Forging:**
- `GET /forge/progress` - Get forging progress
- `POST /forge/category` - Initiate category forge
- `POST /forge/master` - Initiate master forge
- `POST /forge/season` - Initiate seasonal forge
- `GET /forge/{forgeId}/status` - Check forge status

**NFTs:**
- `GET /nfts` - Get player's NFTs
- `GET /nfts/{assetFingerprint}` - Get NFT details

**Categories:**
- `GET /categories` - Get all categories
- `GET /categories/{categoryId}` - Get category details

---

### Current Database Stats

**Categories:** 10 active  
**Total NFTs in Catalog:** 383  
- Science: 38 NFTs
- History: 33 NFTs
- Geography: 39 NFTs
- Sports: 39 NFTs
- Arts: 43 NFTs
- Entertainment: 42 NFTs
- Technology: 39 NFTs
- Weird & Wonderful: 37 NFTs
- Mythology: 34 NFTs
- Nature: 39 NFTs

**Minted NFTs:** 52 (13.6%)  
**Available NFTs:** 331 (86.4%)

---

## Summary

### The Complete Flow

```
1. Play Trivia → Perfect Score
         ↓
2. Earn Eligibility (1 hour to mint)
         ↓
3. Mint Category NFT to Wallet
         ↓
4. Collect 10 from Same Category
         ↓
5. Forge Category Ultimate (burn 10)
         ↓
6. Collect 1 from Each Category
         ↓
7. Forge Master Ultimate (burn 10)
         ↓
8. Collect 2 from Each Category (Seasonal)
         ↓
9. Forge Seasonal Ultimate (burn 20)
         ↓
10. Ultimate Collection Complete! 🏆
```

### Key Numbers

- **10 Categories**
- **4 Tiers** (Category, Category Ultimate, Master Ultimate, Seasonal Ultimate)
- **10 NFTs** to forge Category Ultimate
- **10 NFTs** (1 per category) to forge Master Ultimate
- **20 NFTs** (2 per category) to forge Seasonal Ultimate
- **1 hour** eligibility window (connected wallet)
- **25 minutes** eligibility window (guest)
- **3 months** per season
- **7 days** grace period for seasonal forging
- **5-10 minutes** to complete a forge

---

*This guide covers the complete TriviaNFT system as of November 22, 2025*
