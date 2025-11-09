# Forge Handlers

This directory contains Lambda handlers for NFT forging operations.

## Overview

The forging system allows players to combine multiple NFTs to create higher-tier Ultimate NFTs. There are three types of forging:

1. **Category Ultimate**: Forge 10 NFTs from the same category into a Category Ultimate NFT
2. **Master Ultimate**: Forge 1 NFT from each of 10 different categories into a Master Ultimate NFT
3. **Seasonal Ultimate**: Forge 2 NFTs from each active category in the current season into a Seasonal Ultimate NFT

## Endpoints

### GET /forge/progress

Returns the player's forging progress for all forge types.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "progress": [
    {
      "type": "category",
      "categoryId": "uuid",
      "required": 10,
      "current": 7,
      "nfts": [...],
      "canForge": false
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
      "required": 9,
      "current": 5,
      "nfts": [...],
      "canForge": false
    }
  ]
}
```

### POST /forge/category, /forge/master, /forge/season

Initiates a forge operation.

**Authentication**: Required (JWT with stake key)

**Request Body**:
```json
{
  "type": "category",
  "categoryId": "uuid",
  "inputFingerprints": ["asset1...", "asset2...", ...]
}
```

**Response**:
```json
{
  "forgeOperation": {
    "id": "uuid",
    "type": "category",
    "stakeKey": "stake1...",
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### GET /forge/{forgeId}/status

Returns the status of a forge operation.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "forgeOperation": {
    "id": "uuid",
    "type": "category",
    "status": "confirmed",
    "burnTxHash": "tx_hash...",
    "mintTxHash": "tx_hash...",
    "outputAssetFingerprint": "asset...",
    "createdAt": "2025-01-01T00:00:00Z",
    "confirmedAt": "2025-01-01T00:05:00Z"
  },
  "executionStatus": {
    "status": "SUCCEEDED",
    "startDate": "2025-01-01T00:00:00Z",
    "stopDate": "2025-01-01T00:05:00Z"
  },
  "ultimateNFT": {
    "id": "uuid",
    "assetFingerprint": "asset...",
    "tokenName": "ultimate_...",
    "tier": "ultimate",
    "metadata": {...}
  }
}
```

## Forge Workflow

The forge operation is executed as a Step Functions state machine with the following steps:

1. **Validate Ownership**: Verify the player owns all input NFTs (on-chain verification)
2. **Build Burn Transaction**: Create a transaction to burn the input NFTs
3. **Sign Burn Transaction**: Sign with the centralized policy key
4. **Submit Burn**: Submit the burn transaction to the blockchain
5. **Check Burn Confirmation**: Poll for burn transaction confirmation
6. **Build Mint Ultimate**: Create a transaction to mint the Ultimate NFT
7. **Sign Mint Transaction**: Sign with the centralized policy key
8. **Submit Mint**: Submit the mint transaction to the blockchain
9. **Check Mint Confirmation**: Poll for mint transaction confirmation
10. **Update Forge Record**: Update database with results and mark input NFTs as burned

## Validation Rules

### Category Ultimate
- Requires exactly 10 NFTs
- All NFTs must be from the same category
- All NFTs must be tier "category"
- Player must own all NFTs

### Master Ultimate
- Requires exactly 10 NFTs
- NFTs must be from 10 different categories
- All NFTs must be tier "category"
- Player must own all NFTs

### Seasonal Ultimate
- Requires 2 NFTs from each active category (18 total for 9 categories)
- All NFTs must be from the current season
- Must be within season or grace period
- Player must own all NFTs

## Error Handling

The forge workflow includes:
- Retry logic with exponential backoff (3 attempts)
- Error catching at each step
- Compensation logic for partial failures
- Detailed error logging

## Database Schema

### forge_operations
```sql
CREATE TABLE forge_operations (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  stake_key VARCHAR(255) NOT NULL,
  category_id UUID,
  season_id VARCHAR(50),
  input_fingerprints JSONB NOT NULL,
  burn_tx_hash VARCHAR(64),
  mint_tx_hash VARCHAR(64),
  output_asset_fingerprint VARCHAR(44),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
```

### player_nfts
```sql
CREATE TABLE player_nfts (
  id UUID PRIMARY KEY,
  stake_key VARCHAR(255) NOT NULL,
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44) NOT NULL UNIQUE,
  token_name VARCHAR(64) NOT NULL,
  source VARCHAR(20) NOT NULL,
  category_id UUID,
  season_id VARCHAR(50),
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  minted_at TIMESTAMPTZ NOT NULL,
  burned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Requirements

This implementation satisfies the following requirements:
- Requirement 15: Category Ultimate Forging
- Requirement 16: Master Ultimate Forging
- Requirement 17: Seasonal Ultimate Forging
- Requirement 18: Forging Ownership Rules
- Requirement 29: Forging Progress Indicators
- Requirement 35: Player Messaging - Forge Confirmation

## TODO

- [ ] Implement actual Blockfrost on-chain ownership verification
- [ ] Implement actual transaction building with Lucid library
- [ ] Implement actual transaction signing with policy keys
- [ ] Implement actual transaction submission to blockchain
- [ ] Add IPFS upload for Ultimate NFT metadata
- [ ] Add comprehensive error handling for blockchain failures
- [ ] Add metrics and monitoring for forge operations
- [ ] Add rate limiting for forge requests
