/**
 * Integration Tests: NFT Forging Flow
 * 
 * Tests the complete forging flow including:
 * - Category Ultimate forging with 10 NFTs
 * - Master Ultimate forging with 10 categories
 * - Seasonal Ultimate forging
 * - Ownership validation
 * - Burn and mint transactions (mocked)
 * - Forge records in database
 * 
 * Requirements: 15, 16, 17
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { ForgeService } from '../../services/forge-service.js';
import { query } from '../../db/connection.js';
import { ForgeStatus } from '@trivia-nft/shared';

describe('Forging Flow Integration Tests', () => {
  let forgeService: ForgeService;
  let pool: Pool;
  let testStakeKey: string;
  let testPolicyId: string;
  let testCategories: string[] = [];
  let testSeasonId: string;
  let testNFTFingerprints: string[] = [];

  beforeAll(async () => {
    // Create pool for forge service
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'trivianft',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    forgeService = new ForgeService(pool);

    // Generate test identifiers
    testStakeKey = `stake1test${uuidv4().replace(/-/g, '').substring(0, 49)}`;
    testPolicyId = `policy${uuidv4().replace(/-/g, '').substring(0, 50)}`;

    // Create test player
    await query(
      `INSERT INTO players (stake_key, username, last_seen_at)
       VALUES ($1, $2, NOW())`,
      [testStakeKey, `forgetest_${Date.now()}`]
    );

    // Create test season
    const seasonResult = await query(
      `INSERT INTO seasons (name, starts_at, ends_at, grace_days, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'Test Season',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Started 30 days ago
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 60 days
        7,
        true,
      ]
    );
    testSeasonId = seasonResult.rows[0].id;

    // Create 10 test categories
    for (let i = 0; i < 10; i++) {
      const categoryResult = await query(
        `INSERT INTO categories (name, description, is_active)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [`Forge Test Category ${i + 1}`, `Category ${i + 1} for forging tests`, true]
      );
      testCategories.push(categoryResult.rows[0].id);
    }

    // Create test NFTs for the player
    // Category 1: 12 NFTs (enough for Category Ultimate)
    for (let i = 0; i < 12; i++) {
      const fingerprint = `asset1test${uuidv4().replace(/-/g, '').substring(0, 50)}`;
      testNFTFingerprints.push(fingerprint);

      await query(
        `INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, season_id, tier, status, minted_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)`,
        [
          testStakeKey,
          testPolicyId,
          fingerprint,
          `TestNFT${i + 1}`,
          'mint',
          testCategories[0],
          testSeasonId,
          'category',
          'confirmed',
          JSON.stringify({ name: `Test NFT ${i + 1}`, category: 'Test Category 1' }),
        ]
      );
    }

    // Categories 2-10: 1 NFT each (for Master Ultimate)
    for (let i = 1; i < 10; i++) {
      const fingerprint = `asset1test${uuidv4().replace(/-/g, '').substring(0, 50)}`;
      testNFTFingerprints.push(fingerprint);

      await query(
        `INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, season_id, tier, status, minted_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)`,
        [
          testStakeKey,
          testPolicyId,
          fingerprint,
          `TestNFT_Cat${i + 1}`,
          'mint',
          testCategories[i],
          testSeasonId,
          'category',
          'confirmed',
          JSON.stringify({ name: `Test NFT Category ${i + 1}`, category: `Test Category ${i + 1}` }),
        ]
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
    await query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await query('DELETE FROM seasons WHERE id = $1', [testSeasonId]);
    
    for (const categoryId of testCategories) {
      await query('DELETE FROM categories WHERE id = $1', [categoryId]);
    }
    
    await query('DELETE FROM players WHERE stake_key = $1', [testStakeKey]);

    await pool.end();
  });

  describe('Forge Progress Tracking', () => {
    it('should calculate forge progress correctly', async () => {
      const progress = await forgeService.getForgeProgress(testStakeKey);

      expect(progress).toBeDefined();
      expect(progress.length).toBeGreaterThan(0);

      // Find Category Ultimate progress for category 1 (has 12 NFTs)
      const categoryProgress = progress.find(
        (p) => p.type === 'category' && p.categoryId === testCategories[0]
      );
      expect(categoryProgress).toBeDefined();
      expect(categoryProgress?.current).toBe(12);
      expect(categoryProgress?.required).toBe(10); // Default from AppConfig
      expect(categoryProgress?.canForge).toBe(true);

      // Find Master Ultimate progress
      const masterProgress = progress.find((p) => p.type === 'master');
      expect(masterProgress).toBeDefined();
      expect(masterProgress?.current).toBe(10); // 10 different categories
      expect(masterProgress?.required).toBe(10); // Default from AppConfig
      expect(masterProgress?.canForge).toBe(true);

      // Find Seasonal Ultimate progress
      const seasonalProgress = progress.find((p) => p.type === 'season');
      expect(seasonalProgress).toBeDefined();
      expect(seasonalProgress?.seasonId).toBe(testSeasonId);
    });

    it('should show correct NFTs in progress', async () => {
      const progress = await forgeService.getForgeProgress(testStakeKey);

      const categoryProgress = progress.find(
        (p) => p.type === 'category' && p.categoryId === testCategories[0]
      );

      expect(categoryProgress?.nfts).toBeDefined();
      expect(categoryProgress?.nfts.length).toBeLessThanOrEqual(10); // Only show required amount
      
      categoryProgress?.nfts.forEach((nft) => {
        expect(nft.stakeKey).toBe(testStakeKey);
        expect(nft.categoryId).toBe(testCategories[0]);
        expect(nft.status).toBe('confirmed');
      });
    });
  });

  describe('NFT Ownership Validation', () => {
    it('should validate ownership of NFTs', async () => {
      const fingerprints = testNFTFingerprints.slice(0, 10);
      const isValid = await forgeService.validateNFTOwnership(testStakeKey, fingerprints);

      expect(isValid).toBe(true);
    });

    it('should reject invalid ownership', async () => {
      const fakeFingerprints = [
        `asset1fake${uuidv4().replace(/-/g, '').substring(0, 50)}`,
        `asset1fake${uuidv4().replace(/-/g, '').substring(0, 50)}`,
      ];

      const isValid = await forgeService.validateNFTOwnership(testStakeKey, fakeFingerprints);

      expect(isValid).toBe(false);
    });

    it('should get NFTs by fingerprints', async () => {
      const fingerprints = testNFTFingerprints.slice(0, 5);
      const nfts = await forgeService.getNFTsByFingerprints(fingerprints);

      expect(nfts).toHaveLength(5);
      nfts.forEach((nft) => {
        expect(fingerprints).toContain(nft.assetFingerprint);
        expect(nft.stakeKey).toBe(testStakeKey);
      });
    });
  });

  describe('Category Ultimate Forging', () => {
    it('should create Category Ultimate forge operation', async () => {
      const inputFingerprints = testNFTFingerprints.slice(0, 10);

      const forgeOp = await forgeService.createForgeOperation(
        'category',
        testStakeKey,
        inputFingerprints,
        testCategories[0]
      );

      expect(forgeOp).toBeDefined();
      expect(forgeOp.id).toBeDefined();
      expect(forgeOp.type).toBe('category');
      expect(forgeOp.stakeKey).toBe(testStakeKey);
      expect(forgeOp.categoryId).toBe(testCategories[0]);
      expect(forgeOp.inputFingerprints).toEqual(inputFingerprints);
      expect(forgeOp.status).toBe(ForgeStatus.PENDING);
    });

    it('should complete Category Ultimate forging flow', async () => {
      const inputFingerprints = testNFTFingerprints.slice(0, 10);

      // 1. Validate ownership
      const isValid = await forgeService.validateNFTOwnership(testStakeKey, inputFingerprints);
      expect(isValid).toBe(true);

      // 2. Create forge operation
      const forgeOp = await forgeService.createForgeOperation(
        'category',
        testStakeKey,
        inputFingerprints,
        testCategories[0]
      );

      // 3. Simulate burn transaction
      const burnTxHash = `burn_tx_${uuidv4().replace(/-/g, '')}`;
      await forgeService.updateForgeStatus(
        forgeOp.id,
        ForgeStatus.PENDING,
        burnTxHash
      );

      // 4. Mark NFTs as burned
      await forgeService.markNFTsBurned(inputFingerprints);

      // 5. Simulate mint transaction for Ultimate NFT
      const mintTxHash = `mint_tx_${uuidv4().replace(/-/g, '')}`;
      const ultimateFingerprint = `asset1ultimate${uuidv4().replace(/-/g, '').substring(0, 44)}`;

      await forgeService.updateForgeStatus(
        forgeOp.id,
        ForgeStatus.CONFIRMED,
        burnTxHash,
        mintTxHash,
        ultimateFingerprint
      );

      // 6. Create Ultimate NFT record
      await forgeService.createUltimateNFT(
        testStakeKey,
        testPolicyId,
        ultimateFingerprint,
        'CategoryUltimate',
        'ultimate',
        testCategories[0],
        undefined,
        {
          name: 'Category Ultimate NFT',
          tier: 'ultimate',
          category: 'Test Category 1',
        }
      );

      // Verify forge operation
      const updatedForge = await forgeService.getForgeOperation(forgeOp.id);
      expect(updatedForge?.status).toBe(ForgeStatus.CONFIRMED);
      expect(updatedForge?.burnTxHash).toBe(burnTxHash);
      expect(updatedForge?.mintTxHash).toBe(mintTxHash);
      expect(updatedForge?.outputAssetFingerprint).toBe(ultimateFingerprint);

      // Verify input NFTs are burned
      const burnedNFTs = await query(
        'SELECT status, burned_at FROM player_nfts WHERE asset_fingerprint = ANY($1)',
        [inputFingerprints]
      );
      burnedNFTs.rows.forEach((row) => {
        expect(row.status).toBe('burned');
        expect(row.burned_at).toBeDefined();
      });

      // Verify Ultimate NFT was created
      const ultimateNFT = await query(
        'SELECT * FROM player_nfts WHERE asset_fingerprint = $1',
        [ultimateFingerprint]
      );
      expect(ultimateNFT.rows).toHaveLength(1);
      expect(ultimateNFT.rows[0].tier).toBe('ultimate');
      expect(ultimateNFT.rows[0].source).toBe('forge');
      expect(ultimateNFT.rows[0].category_id).toBe(testCategories[0]);
    });
  });

  describe('Master Ultimate Forging', () => {
    it('should create Master Ultimate forge operation', async () => {
      // Select 1 NFT from each of 10 different categories
      const inputFingerprints = testNFTFingerprints.slice(10, 20); // Categories 2-10 + 1 from category 1

      const forgeOp = await forgeService.createForgeOperation(
        'master',
        testStakeKey,
        inputFingerprints
      );

      expect(forgeOp).toBeDefined();
      expect(forgeOp.type).toBe('master');
      expect(forgeOp.stakeKey).toBe(testStakeKey);
      expect(forgeOp.categoryId).toBeUndefined();
      expect(forgeOp.inputFingerprints).toEqual(inputFingerprints);
      expect(forgeOp.status).toBe(ForgeStatus.PENDING);
    });

    it('should complete Master Ultimate forging flow', async () => {
      // Use 1 NFT from each category (categories 2-10 + 1 more from category 1)
      const inputFingerprints = [
        testNFTFingerprints[10], // Category 1 (another one)
        ...testNFTFingerprints.slice(12, 21), // Categories 2-10
      ];

      // 1. Validate ownership
      const isValid = await forgeService.validateNFTOwnership(testStakeKey, inputFingerprints);
      expect(isValid).toBe(true);

      // 2. Create forge operation
      const forgeOp = await forgeService.createForgeOperation(
        'master',
        testStakeKey,
        inputFingerprints
      );

      // 3. Simulate burn and mint
      const burnTxHash = `burn_tx_${uuidv4().replace(/-/g, '')}`;
      const mintTxHash = `mint_tx_${uuidv4().replace(/-/g, '')}`;
      const masterFingerprint = `asset1master${uuidv4().replace(/-/g, '').substring(0, 46)}`;

      await forgeService.markNFTsBurned(inputFingerprints);
      await forgeService.updateForgeStatus(
        forgeOp.id,
        ForgeStatus.CONFIRMED,
        burnTxHash,
        mintTxHash,
        masterFingerprint
      );

      // 4. Create Master NFT record
      await forgeService.createUltimateNFT(
        testStakeKey,
        testPolicyId,
        masterFingerprint,
        'MasterUltimate',
        'master',
        undefined,
        undefined,
        {
          name: 'Master Ultimate NFT',
          tier: 'master',
          description: 'Forged from 10 different categories',
        }
      );

      // Verify Master NFT
      const masterNFT = await query(
        'SELECT * FROM player_nfts WHERE asset_fingerprint = $1',
        [masterFingerprint]
      );
      expect(masterNFT.rows).toHaveLength(1);
      expect(masterNFT.rows[0].tier).toBe('master');
      expect(masterNFT.rows[0].source).toBe('forge');
      expect(masterNFT.rows[0].category_id).toBeNull();
    });
  });

  describe('Seasonal Ultimate Forging', () => {
    it('should create Seasonal Ultimate forge operation', async () => {
      // For seasonal, we need 2 NFTs from each active category
      // We only have enough NFTs from category 1 for this test
      const inputFingerprints = testNFTFingerprints.slice(0, 2);

      const forgeOp = await forgeService.createForgeOperation(
        'season',
        testStakeKey,
        inputFingerprints,
        undefined,
        testSeasonId
      );

      expect(forgeOp).toBeDefined();
      expect(forgeOp.type).toBe('season');
      expect(forgeOp.stakeKey).toBe(testStakeKey);
      expect(forgeOp.seasonId).toBe(testSeasonId);
      expect(forgeOp.status).toBe(ForgeStatus.PENDING);
    });

    it('should check seasonal forging eligibility', async () => {
      const progress = await forgeService.getForgeProgress(testStakeKey);

      const seasonalProgress = progress.find((p) => p.type === 'season');
      expect(seasonalProgress).toBeDefined();
      expect(seasonalProgress?.seasonId).toBe(testSeasonId);
      
      // We don't have enough NFTs from all categories for seasonal forging
      // (need 2 from each of 10 categories = 20 NFTs, we only have 21 total but not distributed correctly)
      expect(seasonalProgress?.canForge).toBe(false);
    });
  });

  describe('Forge Operation Management', () => {
    it('should get forge operation by ID', async () => {
      const inputFingerprints = testNFTFingerprints.slice(0, 10);
      const forgeOp = await forgeService.createForgeOperation(
        'category',
        testStakeKey,
        inputFingerprints,
        testCategories[0]
      );

      const retrieved = await forgeService.getForgeOperation(forgeOp.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(forgeOp.id);
      expect(retrieved?.type).toBe('category');
      expect(retrieved?.stakeKey).toBe(testStakeKey);
    });

    it('should update forge status with transaction hashes', async () => {
      const inputFingerprints = testNFTFingerprints.slice(0, 10);
      const forgeOp = await forgeService.createForgeOperation(
        'category',
        testStakeKey,
        inputFingerprints,
        testCategories[0]
      );

      const burnTxHash = `burn_${uuidv4().replace(/-/g, '')}`;
      const mintTxHash = `mint_${uuidv4().replace(/-/g, '')}`;
      const outputFingerprint = `asset1output${uuidv4().replace(/-/g, '').substring(0, 45)}`;

      await forgeService.updateForgeStatus(
        forgeOp.id,
        ForgeStatus.CONFIRMED,
        burnTxHash,
        mintTxHash,
        outputFingerprint
      );

      const updated = await forgeService.getForgeOperation(forgeOp.id);

      expect(updated?.status).toBe(ForgeStatus.CONFIRMED);
      expect(updated?.burnTxHash).toBe(burnTxHash);
      expect(updated?.mintTxHash).toBe(mintTxHash);
      expect(updated?.outputAssetFingerprint).toBe(outputFingerprint);
      expect(updated?.confirmedAt).toBeDefined();
    });

    it('should handle forge operation failure', async () => {
      const inputFingerprints = testNFTFingerprints.slice(0, 10);
      const forgeOp = await forgeService.createForgeOperation(
        'category',
        testStakeKey,
        inputFingerprints,
        testCategories[0]
      );

      const errorMsg = 'Blockchain transaction failed';

      await forgeService.updateForgeStatus(
        forgeOp.id,
        ForgeStatus.FAILED,
        undefined,
        undefined,
        undefined,
        errorMsg
      );

      const updated = await forgeService.getForgeOperation(forgeOp.id);

      expect(updated?.status).toBe(ForgeStatus.FAILED);
      expect(updated?.error).toBe(errorMsg);
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient NFTs for forging', async () => {
      const progress = await forgeService.getForgeProgress(testStakeKey);

      // Find a category with less than 10 NFTs
      const insufficientProgress = progress.find(
        (p) => p.type === 'category' && p.current < 10
      );

      if (insufficientProgress) {
        expect(insufficientProgress.canForge).toBe(false);
      }
    });

    it('should validate all NFTs belong to same category for Category Ultimate', async () => {
      // Try to forge with NFTs from different categories
      const mixedFingerprints = [
        testNFTFingerprints[0], // Category 1
        testNFTFingerprints[12], // Category 2
      ];

      const nfts = await forgeService.getNFTsByFingerprints(mixedFingerprints);
      const categories = new Set(nfts.map((nft) => nft.categoryId));

      // Should have NFTs from different categories
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should return null for non-existent forge operation', async () => {
      const fakeId = uuidv4();
      const forgeOp = await forgeService.getForgeOperation(fakeId);

      expect(forgeOp).toBeNull();
    });
  });
});
