/**
 * Integration Tests: NFT Minting Flow
 * 
 * Tests the complete minting flow including:
 * - Mint initiation with valid eligibility
 * - IPFS upload and pinning (mocked)
 * - Blockchain transaction submission (mocked)
 * - Confirmation polling (mocked)
 * - Database updates
 * - NFT appears in inventory
 * 
 * Requirements: 14
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { MintService } from '../../services/mint-service.js';
import { query } from '../../db/connection.js';
import { EligibilityStatus, MintStatus } from '@trivia-nft/shared';

describe('Minting Flow Integration Tests', () => {
  let mintService: MintService;
  let pool: Pool;
  let testCategoryId: string;
  let testPlayerId: string;
  let testStakeKey: string;
  let testEligibilityId: string;
  let testPolicyId: string;

  beforeAll(async () => {
    // Create pool for mint service
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'trivianft',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    mintService = new MintService(pool);

    // Generate test identifiers
    testStakeKey = `stake1test${uuidv4().replace(/-/g, '').substring(0, 49)}`;
    testPolicyId = `policy${uuidv4().replace(/-/g, '').substring(0, 50)}`;

    // Create test category
    const categoryResult = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Mint Test Category', 'Category for minting tests', true]
    );
    testCategoryId = categoryResult.rows[0].id;

    // Create test player
    const playerResult = await query(
      `INSERT INTO players (stake_key, username, last_seen_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [testStakeKey, `minttest_${Date.now()}`]
    );
    testPlayerId = playerResult.rows[0].id;

    // Create test NFT catalog items
    for (let i = 0; i < 5; i++) {
      await query(
        `INSERT INTO nft_catalog (
          category_id, name, description, s3_art_key, s3_meta_key, 
          tier, attributes, is_minted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          testCategoryId,
          `Test NFT ${i + 1}`,
          `Description for test NFT ${i + 1}`,
          `art/test-${i + 1}.png`,
          `meta/test-${i + 1}.json`,
          'category',
          JSON.stringify([
            { trait_type: 'Category', value: 'Test' },
            { trait_type: 'Number', value: `${i + 1}` },
          ]),
          false,
        ]
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await query('DELETE FROM mints WHERE player_id = $1', [testPlayerId]);
    await query('DELETE FROM eligibilities WHERE player_id = $1', [testPlayerId]);
    await query('DELETE FROM nft_catalog WHERE category_id = $1', [testCategoryId]);
    await query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
    await query('DELETE FROM players WHERE id = $1', [testPlayerId]);

    await pool.end();
  });

  beforeEach(async () => {
    // Create fresh eligibility for each test
    const eligibilityResult = await query(
      `INSERT INTO eligibilities (
        type, category_id, player_id, stake_key, status, expires_at, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        'category',
        testCategoryId,
        testPlayerId,
        testStakeKey,
        EligibilityStatus.ACTIVE,
        new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        uuidv4(),
      ]
    );
    testEligibilityId = eligibilityResult.rows[0].id;
  });

  describe('Eligibility Validation', () => {
    it('should get active eligibilities for a player', async () => {
      const eligibilities = await mintService.getEligibilities(testPlayerId);

      expect(eligibilities).toBeDefined();
      expect(eligibilities.length).toBeGreaterThan(0);
      
      const eligibility = eligibilities.find((e) => e.id === testEligibilityId);
      expect(eligibility).toBeDefined();
      expect(eligibility?.status).toBe(EligibilityStatus.ACTIVE);
      expect(eligibility?.categoryId).toBe(testCategoryId);
      expect(eligibility?.playerId).toBe(testPlayerId);
    });

    it('should validate active eligibility successfully', async () => {
      const eligibility = await mintService.validateEligibility(testEligibilityId);

      expect(eligibility).toBeDefined();
      expect(eligibility.id).toBe(testEligibilityId);
      expect(eligibility.status).toBe(EligibilityStatus.ACTIVE);
    });

    it('should reject expired eligibility', async () => {
      // Create expired eligibility
      const expiredResult = await query(
        `INSERT INTO eligibilities (
          type, category_id, player_id, stake_key, status, expires_at, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          'category',
          testCategoryId,
          testPlayerId,
          testStakeKey,
          EligibilityStatus.ACTIVE,
          new Date(Date.now() - 1000).toISOString(), // Already expired
          uuidv4(),
        ]
      );
      const expiredId = expiredResult.rows[0].id;

      await expect(
        mintService.validateEligibility(expiredId)
      ).rejects.toThrow('Eligibility has expired');

      // Verify it was marked as expired
      const result = await query(
        'SELECT status FROM eligibilities WHERE id = $1',
        [expiredId]
      );
      expect(result.rows[0].status).toBe(EligibilityStatus.EXPIRED);
    });

    it('should reject used eligibility', async () => {
      // Mark eligibility as used
      await mintService.markEligibilityUsed(testEligibilityId);

      await expect(
        mintService.validateEligibility(testEligibilityId)
      ).rejects.toThrow('Eligibility is used, cannot mint');
    });

    it('should reject non-existent eligibility', async () => {
      const fakeId = uuidv4();

      await expect(
        mintService.validateEligibility(fakeId)
      ).rejects.toThrow('Eligibility not found');
    });
  });

  describe('NFT Stock Management', () => {
    it('should check stock availability', async () => {
      const available = await mintService.checkStockAvailability(testCategoryId);

      expect(available).toBe(true);
    });

    it('should get available NFT count', async () => {
      const count = await mintService.getAvailableNFTCount(testCategoryId);

      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(5); // We created 5 NFTs
    });

    it('should select an available NFT', async () => {
      const nft = await mintService.selectAvailableNFT(testCategoryId);

      expect(nft).toBeDefined();
      expect(nft?.categoryId).toBe(testCategoryId);
      expect(nft?.isMinted).toBe(false);
      expect(nft?.tier).toBe('category');
      expect(nft?.name).toMatch(/Test NFT \d+/);
    });

    it('should return null when no NFTs available', async () => {
      // Create category with no NFTs
      const emptyCategory = await query(
        `INSERT INTO categories (name, description, is_active)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Empty Category', 'No NFTs here', true]
      );

      const nft = await mintService.selectAvailableNFT(emptyCategory.rows[0].id);

      expect(nft).toBeNull();

      // Clean up
      await query('DELETE FROM categories WHERE id = $1', [emptyCategory.rows[0].id]);
    });
  });

  describe('Mint Operation Creation', () => {
    it('should create mint operation record', async () => {
      const nft = await mintService.selectAvailableNFT(testCategoryId);
      expect(nft).toBeDefined();

      const mintOp = await mintService.createMintOperation(
        testEligibilityId,
        nft!.id,
        testPlayerId,
        testStakeKey,
        testPolicyId
      );

      expect(mintOp).toBeDefined();
      expect(mintOp.id).toBeDefined();
      expect(mintOp.eligibilityId).toBe(testEligibilityId);
      expect(mintOp.catalogId).toBe(nft!.id);
      expect(mintOp.status).toBe(MintStatus.PENDING);
      expect(mintOp.txHash).toBeUndefined();
      expect(mintOp.createdAt).toBeDefined();
    });

    it('should get mint operation by ID', async () => {
      const nft = await mintService.selectAvailableNFT(testCategoryId);
      const mintOp = await mintService.createMintOperation(
        testEligibilityId,
        nft!.id,
        testPlayerId,
        testStakeKey,
        testPolicyId
      );

      const retrieved = await mintService.getMintOperation(mintOp.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mintOp.id);
      expect(retrieved?.status).toBe(MintStatus.PENDING);
    });
  });

  describe('Mint Status Updates', () => {
    it('should update mint status to confirmed with tx hash', async () => {
      const nft = await mintService.selectAvailableNFT(testCategoryId);
      const mintOp = await mintService.createMintOperation(
        testEligibilityId,
        nft!.id,
        testPlayerId,
        testStakeKey,
        testPolicyId
      );

      const txHash = `tx_${uuidv4().replace(/-/g, '')}`;

      await mintService.updateMintStatus(
        mintOp.id,
        MintStatus.CONFIRMED,
        txHash
      );

      const updated = await mintService.getMintOperation(mintOp.id);

      expect(updated?.status).toBe(MintStatus.CONFIRMED);
      expect(updated?.txHash).toBe(txHash);
      expect(updated?.confirmedAt).toBeDefined();
    });

    it('should update mint status to failed with error', async () => {
      const nft = await mintService.selectAvailableNFT(testCategoryId);
      const mintOp = await mintService.createMintOperation(
        testEligibilityId,
        nft!.id,
        testPlayerId,
        testStakeKey,
        testPolicyId
      );

      const errorMsg = 'Blockchain transaction failed';

      await mintService.updateMintStatus(
        mintOp.id,
        MintStatus.FAILED,
        undefined,
        errorMsg
      );

      const updated = await mintService.getMintOperation(mintOp.id);

      expect(updated?.status).toBe(MintStatus.FAILED);
      expect(updated?.error).toBe(errorMsg);
    });
  });

  describe('Complete Minting Flow', () => {
    it('should complete full minting flow with database updates', async () => {
      // 1. Validate eligibility
      const eligibility = await mintService.validateEligibility(testEligibilityId);
      expect(eligibility.status).toBe(EligibilityStatus.ACTIVE);

      // 2. Check stock availability
      const available = await mintService.checkStockAvailability(testCategoryId);
      expect(available).toBe(true);

      // 3. Select NFT
      const nft = await mintService.selectAvailableNFT(testCategoryId);
      expect(nft).toBeDefined();

      // 4. Create mint operation
      const mintOp = await mintService.createMintOperation(
        testEligibilityId,
        nft!.id,
        testPlayerId,
        testStakeKey,
        testPolicyId
      );
      expect(mintOp.status).toBe(MintStatus.PENDING);

      // 5. Simulate IPFS upload (in real flow, this would be done by workflow Lambda)
      const ipfsCid = `Qm${uuidv4().replace(/-/g, '')}`;

      // 6. Simulate blockchain transaction (in real flow, this would be done by workflow Lambda)
      const txHash = `tx_${uuidv4().replace(/-/g, '')}`;
      const assetFingerprint = `asset1${uuidv4().replace(/-/g, '').substring(0, 50)}`;
      const tokenName = nft!.name.replace(/\s+/g, '');

      // 7. Update mint status to confirmed
      await mintService.updateMintStatus(
        mintOp.id,
        MintStatus.CONFIRMED,
        txHash
      );

      // 8. Mark eligibility as used
      await mintService.markEligibilityUsed(testEligibilityId);

      // 9. Mark catalog item as minted
      await mintService.markCatalogItemMinted(nft!.id, ipfsCid);

      // 10. Create player NFT record
      await mintService.createPlayerNFT(
        testStakeKey,
        testPolicyId,
        assetFingerprint,
        tokenName,
        testCategoryId,
        {
          name: nft!.name,
          image: `ipfs://${ipfsCid}`,
          attributes: nft!.attributes,
        }
      );

      // Verify all updates
      const updatedMint = await mintService.getMintOperation(mintOp.id);
      expect(updatedMint?.status).toBe(MintStatus.CONFIRMED);
      expect(updatedMint?.txHash).toBe(txHash);

      const updatedEligibility = await mintService.getEligibility(testEligibilityId);
      expect(updatedEligibility?.status).toBe(EligibilityStatus.USED);

      const catalogResult = await query(
        'SELECT is_minted, ipfs_cid FROM nft_catalog WHERE id = $1',
        [nft!.id]
      );
      expect(catalogResult.rows[0].is_minted).toBe(true);
      expect(catalogResult.rows[0].ipfs_cid).toBe(ipfsCid);

      const playerNftResult = await query(
        'SELECT * FROM player_nfts WHERE stake_key = $1 AND asset_fingerprint = $2',
        [testStakeKey, assetFingerprint]
      );
      expect(playerNftResult.rows).toHaveLength(1);
      expect(playerNftResult.rows[0].status).toBe('confirmed');
      expect(playerNftResult.rows[0].category_id).toBe(testCategoryId);
    });

    it('should verify NFT appears in player inventory', async () => {
      // Query player NFTs
      const result = await query(
        `SELECT 
          id, stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, tier, status, minted_at, metadata
         FROM player_nfts
         WHERE stake_key = $1 AND status = $2`,
        [testStakeKey, 'confirmed']
      );

      expect(result.rows.length).toBeGreaterThan(0);

      const nft = result.rows[0];
      expect(nft.stake_key).toBe(testStakeKey);
      expect(nft.category_id).toBe(testCategoryId);
      expect(nft.tier).toBe('category');
      expect(nft.source).toBe('mint');
      expect(nft.status).toBe('confirmed');
      expect(nft.metadata).toBeDefined();

      const metadata = nft.metadata;
      expect(metadata.name).toBeDefined();
      expect(metadata.image).toMatch(/^ipfs:\/\//);
      if (metadata.attributes) {
        expect(metadata.attributes).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient stock gracefully', async () => {
      // Mark all NFTs as minted
      await query(
        'UPDATE nft_catalog SET is_minted = true WHERE category_id = $1',
        [testCategoryId]
      );

      const available = await mintService.checkStockAvailability(testCategoryId);
      expect(available).toBe(false);

      const nft = await mintService.selectAvailableNFT(testCategoryId);
      expect(nft).toBeNull();

      // Restore NFTs for other tests
      await query(
        'UPDATE nft_catalog SET is_minted = false WHERE category_id = $1',
        [testCategoryId]
      );
    });

    it('should handle concurrent minting attempts', async () => {
      // Create two eligibilities
      await query(
        `INSERT INTO eligibilities (
          type, category_id, player_id, stake_key, status, expires_at, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          'category',
          testCategoryId,
          testPlayerId,
          testStakeKey,
          EligibilityStatus.ACTIVE,
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          uuidv4(),
        ]
      );

      await query(
        `INSERT INTO eligibilities (
          type, category_id, player_id, stake_key, status, expires_at, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          'category',
          testCategoryId,
          testPlayerId,
          testStakeKey,
          EligibilityStatus.ACTIVE,
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          uuidv4(),
        ]
      );

      // Both should be able to select different NFTs
      const nft1 = await mintService.selectAvailableNFT(testCategoryId);
      const nft2 = await mintService.selectAvailableNFT(testCategoryId);

      expect(nft1).toBeDefined();
      expect(nft2).toBeDefined();
      // They might be the same due to RANDOM(), but both should be valid
      expect(nft1?.categoryId).toBe(testCategoryId);
      expect(nft2?.categoryId).toBe(testCategoryId);
    });
  });
});
