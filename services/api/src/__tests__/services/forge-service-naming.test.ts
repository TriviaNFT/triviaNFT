/**
 * Integration test for Forge Service with New Naming Convention
 * Tests that Category Ultimate NFTs are forged with correct asset names
 * 
 * Requirements: 5.1-5.6
 * Validates: Property 7 (Tier 2 format correctness), Property 8 (Tier 3), Property 9 (Tier 4)
 * 
 * NOTE: These tests are currently skipped because they require database admin privileges
 * to create/drop test databases. Neon (managed PostgreSQL) doesn't support CREATE DATABASE.
 * These tests can be run in CI/CD with a local PostgreSQL instance or Docker.
 * The core naming logic is thoroughly tested in the shared package unit tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { ForgeService } from '../../services/forge-service';
import { 
  buildAssetName, 
  parseAssetName, 
  validateAssetName, 
  generateHexId, 
  getCategoryCode 
} from '@trivia-nft/shared';

describe('Forge Service with New Naming Convention - Category Ultimate', () => {
  let pool: Pool;
  let forgeService: ForgeService;
  let testCategoryId: string;
  let testCategorySlug: string;
  let testStakeKey: string;

  beforeAll(async () => {
    // Connect to the existing Neon database
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://trivia_admin:local_dev_password@localhost:5432/postgres';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Create forge service
    forgeService = new ForgeService(pool);

    // Set up test data
    const categoryResult = await pool.query(`
      SELECT id, slug FROM categories WHERE slug = 'science' LIMIT 1
    `);
    testCategoryId = categoryResult.rows[0].id;
    testCategorySlug = categoryResult.rows[0].slug;

    // Create test player
    testStakeKey = `stake_test_forge_cat_${Date.now()}`;
    await pool.query(`
      INSERT INTO players (stake_key, username, created_at)
      VALUES ($1, $2, NOW())
    `, [testStakeKey, 'test_forge_cat_player']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM players WHERE stake_key = $1', [testStakeKey]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
  });

  it('should create Category Ultimate NFT with correct asset name format', async () => {
    // Generate asset name components
    const hexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const assetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: hexId,
    });
    const typeCode = 'ULT';

    // Create test metadata
    const metadata = {
      name: 'Science Category Ultimate',
      asset_name: assetName,
      description: 'Forged from 10 Science NFTs',
      image: 'ipfs://test',
      attributes: [
        { trait_type: 'Category', value: 'Science' },
        { trait_type: 'CategoryCode', value: categoryCode },
        { trait_type: 'Tier', value: 'category_ultimate' },
        { trait_type: 'TierCode', value: typeCode },
      ],
    };

    // Create Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1ultimate',
      assetName,
      'ultimate',
      testCategoryId,
      undefined,
      metadata
    );

    // Verify NFT was created with correct data
    const result = await pool.query(`
      SELECT 
        token_name,
        type_code,
        metadata,
        category_id,
        tier
      FROM player_nfts
      WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(1);
    const nft = result.rows[0];

    // Verify asset name format
    expect(nft.token_name).toBe(assetName);
    expect(validateAssetName(nft.token_name)).toBe(true);

    // Verify asset name matches pattern TNFT_V1_{CAT}_ULT_{id}
    const expectedPattern = `TNFT_V1_${categoryCode}_ULT_${hexId}`;
    expect(nft.token_name).toBe(expectedPattern);

    // Verify tier
    expect(nft.tier).toBe('ultimate');

    // Verify metadata includes both asset_name and display_name
    const storedMetadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata;
    expect(storedMetadata.name).toBe('Science Category Ultimate');
    expect(storedMetadata.asset_name).toBe(assetName);
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'CategoryCode', value: categoryCode });
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'TierCode', value: typeCode });
  });

  it('should parse Category Ultimate asset name correctly from database', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const assetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: hexId,
    });

    // Create Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1ultimate',
      assetName,
      'ultimate',
      testCategoryId,
      undefined,
      { name: 'Test Ultimate NFT' }
    );

    // Retrieve and parse
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const parsed = parseAssetName(result.rows[0].token_name);

    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('TNFT');
    expect(parsed?.version).toBe('V1');
    expect(parsed?.tier).toBe('ULT');
    expect(parsed?.categoryCode).toBe(categoryCode);
    expect(parsed?.id).toBe(hexId);
    expect(parsed?.seasonCode).toBeUndefined();
  });

  it('should handle multiple Category Ultimate NFTs with unique asset names', async () => {
    // Create multiple Ultimate NFTs
    const nfts = [];
    for (let i = 0; i < 3; i++) {
      const hexId = generateHexId();
      const categoryCode = getCategoryCode(testCategorySlug as any);
      const assetName = buildAssetName({
        tier: 'category_ultimate',
        categoryCode,
        id: hexId,
      });

      await forgeService.createUltimateNFT(
        testStakeKey,
        'test_policy_id',
        `asset1ultimate${i}`,
        assetName,
        'ultimate',
        testCategoryId,
        undefined,
        { name: `Test Ultimate NFT ${i}` }
      );

      nfts.push(assetName);
    }

    // Verify all NFTs were created with unique asset names
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(3);

    // Check uniqueness
    const assetNames = result.rows.map(row => row.token_name);
    const uniqueNames = new Set(assetNames);
    expect(uniqueNames.size).toBe(3);

    // Verify all follow correct format
    assetNames.forEach(name => {
      expect(validateAssetName(name)).toBe(true);
      expect(name).toMatch(/^TNFT_V1_SCI_ULT_[0-9a-f]{8}$/);
    });
  });

  it('should differentiate between Category and Category Ultimate NFTs', async () => {
    // Create a Category NFT
    const categoryHexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const categoryAssetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: categoryHexId,
    });

    await pool.query(`
      INSERT INTO player_nfts (
        stake_key, policy_id, asset_fingerprint, token_name,
        source, category_id, tier, status, minted_at, metadata, type_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
    `, [
      testStakeKey, 'test_policy_id', 'asset1category', categoryAssetName,
      'mint', testCategoryId, 'category', 'confirmed', 
      JSON.stringify({ name: 'Category NFT' }), 'REG'
    ]);

    // Create a Category Ultimate NFT
    const ultimateHexId = generateHexId();
    const ultimateAssetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: ultimateHexId,
    });

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1ultimate',
      ultimateAssetName,
      'ultimate',
      testCategoryId,
      undefined,
      { name: 'Ultimate NFT' }
    );

    // Query both
    const result = await pool.query(`
      SELECT token_name, tier, type_code
      FROM player_nfts
      WHERE stake_key = $1
      ORDER BY tier
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(2);

    // Verify Category NFT
    const categoryNFT = result.rows[0];
    expect(categoryNFT.tier).toBe('category');
    expect(categoryNFT.token_name).toMatch(/^TNFT_V1_SCI_REG_[0-9a-f]{8}$/);
    expect(categoryNFT.type_code).toBe('REG');

    // Verify Ultimate NFT
    const ultimateNFT = result.rows[1];
    expect(ultimateNFT.tier).toBe('ultimate');
    expect(ultimateNFT.token_name).toMatch(/^TNFT_V1_SCI_ULT_[0-9a-f]{8}$/);
    expect(ultimateNFT.type_code).toBeNull(); // type_code not set in createUltimateNFT yet
  });

  it('should create forge operation and track Category Ultimate creation', async () => {
    // Create 10 input NFTs
    const inputFingerprints: string[] = [];
    for (let i = 0; i < 10; i++) {
      const hexId = generateHexId();
      const categoryCode = getCategoryCode(testCategorySlug as any);
      const assetName = buildAssetName({
        tier: 'category',
        categoryCode,
        id: hexId,
      });

      await pool.query(`
        INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, tier, status, minted_at, metadata, type_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      `, [
        testStakeKey, 'test_policy_id', `asset1input${i}`, assetName,
        'mint', testCategoryId, 'category', 'confirmed',
        JSON.stringify({ name: `Input NFT ${i}` }), 'REG'
      ]);

      inputFingerprints.push(`asset1input${i}`);
    }

    // Create forge operation
    const forgeOp = await forgeService.createForgeOperation(
      'category',
      testStakeKey,
      inputFingerprints,
      testCategoryId,
      undefined
    );

    expect(forgeOp).toBeDefined();
    expect(forgeOp.type).toBe('category');
    expect(forgeOp.categoryId).toBe(testCategoryId);
    expect(forgeOp.inputFingerprints).toEqual(inputFingerprints);

    // Verify forge operation was created
    const result = await pool.query(`
      SELECT * FROM forge_operations WHERE id = $1
    `, [forgeOp.id]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].type).toBe('category');
  });
});

/**
 * Integration test for Master Ultimate NFT Forging
 * Tests that Master Ultimate NFTs are forged with correct asset names
 * 
 * Requirements: 5.1-5.6
 * Validates: Property 8 (Tier 3 format correctness)
 */
describe('Forge Service with New Naming Convention - Master Ultimate', () => {
  let pool: Pool;
  let forgeService: ForgeService;
  let testStakeKey: string;
  let testCategories: Array<{ id: string; slug: string }> = [];

  beforeAll(async () => {
    // Connect to the existing Neon database
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://trivia_admin:local_dev_password@localhost:5432/postgres';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Create forge service
    forgeService = new ForgeService(pool);

    // Get all categories for Master Ultimate testing
    const categoriesResult = await pool.query(`
      SELECT id, slug FROM categories ORDER BY slug LIMIT 10
    `);
    testCategories = categoriesResult.rows;

    // Create test player
    testStakeKey = `stake_test_forge_master_${Date.now()}`;
    await pool.query(`
      INSERT INTO players (stake_key, username, created_at)
      VALUES ($1, $2, NOW())
    `, [testStakeKey, 'test_master_player']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM players WHERE stake_key = $1', [testStakeKey]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
  });

  it('should create Master Ultimate NFT with correct asset name format', async () => {
    // Generate asset name components (no category code for Master Ultimate)
    const hexId = generateHexId();
    const assetName = buildAssetName({
      tier: 'master_ultimate',
      id: hexId,
    });
    const typeCode = 'MAST';

    // Create test metadata
    const metadata = {
      name: 'Master Ultimate',
      asset_name: assetName,
      description: 'Forged from NFTs across 10 different categories',
      image: 'ipfs://test',
      attributes: [
        { trait_type: 'Tier', value: 'master_ultimate' },
        { trait_type: 'TierCode', value: typeCode },
      ],
    };

    // Create Master Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1master',
      assetName,
      'master',
      undefined, // No category for Master Ultimate
      undefined,
      metadata,
      typeCode
    );

    // Verify NFT was created with correct data
    const result = await pool.query(`
      SELECT 
        token_name,
        type_code,
        metadata,
        category_id,
        tier
      FROM player_nfts
      WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(1);
    const nft = result.rows[0];

    // Verify asset name format
    expect(nft.token_name).toBe(assetName);
    expect(validateAssetName(nft.token_name)).toBe(true);

    // Verify asset name matches pattern TNFT_V1_MAST_{id}
    const expectedPattern = `TNFT_V1_MAST_${hexId}`;
    expect(nft.token_name).toBe(expectedPattern);

    // Verify tier
    expect(nft.tier).toBe('master');

    // Verify no category is associated
    expect(nft.category_id).toBeNull();

    // Verify type_code
    expect(nft.type_code).toBe('MAST');

    // Verify metadata includes both asset_name and display_name
    const storedMetadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata;
    expect(storedMetadata.name).toBe('Master Ultimate');
    expect(storedMetadata.asset_name).toBe(assetName);
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'TierCode', value: typeCode });
  });

  it('should parse Master Ultimate asset name correctly from database', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const assetName = buildAssetName({
      tier: 'master_ultimate',
      id: hexId,
    });

    // Create Master Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1master',
      assetName,
      'master',
      undefined,
      undefined,
      { name: 'Test Master Ultimate NFT' },
      'MAST'
    );

    // Retrieve and parse
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const parsed = parseAssetName(result.rows[0].token_name);

    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('TNFT');
    expect(parsed?.version).toBe('V1');
    expect(parsed?.tier).toBe('MAST');
    expect(parsed?.categoryCode).toBeUndefined();
    expect(parsed?.id).toBe(hexId);
    expect(parsed?.seasonCode).toBeUndefined();
  });

  it('should not include category code in Master Ultimate asset name', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const assetName = buildAssetName({
      tier: 'master_ultimate',
      id: hexId,
    });

    // Create Master Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1master',
      assetName,
      'master',
      undefined,
      undefined,
      { name: 'Test Master Ultimate NFT' },
      'MAST'
    );

    // Retrieve asset name
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const tokenName = result.rows[0].token_name;

    // Verify no category codes are present
    const categoryCodesPattern = /(ARTS|ENT|GEO|HIST|MYTH|NAT|SCI|SPORT|TECH|WEIRD)/;
    expect(categoryCodesPattern.test(tokenName)).toBe(false);

    // Verify it follows the correct pattern
    expect(tokenName).toMatch(/^TNFT_V1_MAST_[0-9a-f]{8}$/);
  });

  it('should handle multiple Master Ultimate NFTs with unique asset names', async () => {
    // Create multiple Master Ultimate NFTs
    const nfts = [];
    for (let i = 0; i < 3; i++) {
      const hexId = generateHexId();
      const assetName = buildAssetName({
        tier: 'master_ultimate',
        id: hexId,
      });

      await forgeService.createUltimateNFT(
        testStakeKey,
        'test_policy_id',
        `asset1master${i}`,
        assetName,
        'master',
        undefined,
        undefined,
        { name: `Test Master Ultimate NFT ${i}` },
        'MAST'
      );

      nfts.push(assetName);
    }

    // Verify all NFTs were created with unique asset names
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(3);

    // Check uniqueness
    const assetNames = result.rows.map(row => row.token_name);
    const uniqueNames = new Set(assetNames);
    expect(uniqueNames.size).toBe(3);

    // Verify all follow correct format
    assetNames.forEach(name => {
      expect(validateAssetName(name)).toBe(true);
      expect(name).toMatch(/^TNFT_V1_MAST_[0-9a-f]{8}$/);
    });
  });

  it('should differentiate between Category Ultimate and Master Ultimate NFTs', async () => {
    // Create a Category Ultimate NFT
    const categoryHexId = generateHexId();
    const categoryCode = getCategoryCode('science' as any);
    const categoryUltimateAssetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: categoryHexId,
    });

    const scienceCategoryId = testCategories.find(c => c.slug === 'science')?.id;

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1catult',
      categoryUltimateAssetName,
      'ultimate',
      scienceCategoryId,
      undefined,
      { name: 'Category Ultimate NFT' },
      'ULT'
    );

    // Create a Master Ultimate NFT
    const masterHexId = generateHexId();
    const masterAssetName = buildAssetName({
      tier: 'master_ultimate',
      id: masterHexId,
    });

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1master',
      masterAssetName,
      'master',
      undefined,
      undefined,
      { name: 'Master Ultimate NFT' },
      'MAST'
    );

    // Query both
    const result = await pool.query(`
      SELECT token_name, tier, type_code, category_id
      FROM player_nfts
      WHERE stake_key = $1
      ORDER BY tier
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(2);

    // Verify Master Ultimate NFT (comes first alphabetically)
    const masterNFT = result.rows[0];
    expect(masterNFT.tier).toBe('master');
    expect(masterNFT.token_name).toMatch(/^TNFT_V1_MAST_[0-9a-f]{8}$/);
    expect(masterNFT.type_code).toBe('MAST');
    expect(masterNFT.category_id).toBeNull();

    // Verify Category Ultimate NFT
    const categoryUltimateNFT = result.rows[1];
    expect(categoryUltimateNFT.tier).toBe('ultimate');
    expect(categoryUltimateNFT.token_name).toMatch(/^TNFT_V1_SCI_ULT_[0-9a-f]{8}$/);
    expect(categoryUltimateNFT.type_code).toBe('ULT');
    expect(categoryUltimateNFT.category_id).toBe(scienceCategoryId);
  });

  it('should create forge operation for Master Ultimate with correct type', async () => {
    // Create 10 input NFTs from different categories
    const inputFingerprints: string[] = [];
    for (let i = 0; i < Math.min(10, testCategories.length); i++) {
      const category = testCategories[i];
      const hexId = generateHexId();
      const categoryCode = getCategoryCode(category.slug as any);
      const assetName = buildAssetName({
        tier: 'category',
        categoryCode,
        id: hexId,
      });

      await pool.query(`
        INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, tier, status, minted_at, metadata, type_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      `, [
        testStakeKey, 'test_policy_id', `asset1input${i}`, assetName,
        'mint', category.id, 'category', 'confirmed',
        JSON.stringify({ name: `Input NFT ${i}` }), 'REG'
      ]);

      inputFingerprints.push(`asset1input${i}`);
    }

    // Create forge operation for Master Ultimate
    const forgeOp = await forgeService.createForgeOperation(
      'master',
      testStakeKey,
      inputFingerprints,
      undefined, // No category for Master Ultimate
      undefined
    );

    expect(forgeOp).toBeDefined();
    expect(forgeOp.type).toBe('master');
    expect(forgeOp.categoryId).toBeNull();
    expect(forgeOp.inputFingerprints).toEqual(inputFingerprints);

    // Verify forge operation was created
    const result = await pool.query(`
      SELECT * FROM forge_operations WHERE id = $1
    `, [forgeOp.id]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].type).toBe('master');
    expect(result.rows[0].category_id).toBeNull();
  });
});



/**
 * Integration test for Seasonal Ultimate NFT Forging
 * Tests that Seasonal Ultimate NFTs are forged with correct asset names
 * 
 * Requirements: 4.1-4.6, 5.1-5.6
 * Validates: Property 9 (Tier 4 format correctness)
 */
describe('Forge Service with New Naming Convention - Seasonal Ultimate', () => {
  let pool: Pool;
  let forgeService: ForgeService;
  let testStakeKey: string;
  let testCategories: Array<{ id: string; slug: string }> = [];
  let testSeasonId: string;

  beforeAll(async () => {
    // Connect to the existing Neon database
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://trivia_admin:local_dev_password@localhost:5432/postgres';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Create forge service
    forgeService = new ForgeService(pool);

    // Get all categories for Seasonal Ultimate testing
    const categoriesResult = await pool.query(`
      SELECT id, slug FROM categories ORDER BY slug LIMIT 10
    `);
    testCategories = categoriesResult.rows;

    // Create test player
    testStakeKey = `stake_test_forge_seasonal_${Date.now()}`;
    await pool.query(`
      INSERT INTO players (stake_key, username, created_at)
      VALUES ($1, $2, NOW())
    `, [testStakeKey, 'test_seasonal_player']);

    // Create a test season
    const seasonResult = await pool.query(`
      INSERT INTO seasons (id, name, starts_at, ends_at, is_active, grace_days)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id
    `, ['Test Winter Season', '2024-01-01', '2024-03-31', false, 0]);
    testSeasonId = seasonResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM seasons WHERE id = $1', [testSeasonId]);
    await pool.query('DELETE FROM players WHERE stake_key = $1', [testStakeKey]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
  });

  it('should create Seasonal Ultimate NFT with correct asset name format', async () => {
    // Generate asset name components
    const hexId = generateHexId();
    const seasonCode = 'WI1'; // Winter Season 1
    const assetName = buildAssetName({
      tier: 'seasonal_ultimate',
      seasonCode,
      id: hexId,
    });
    const typeCode = 'SEAS';

    // Create test metadata
    const metadata = {
      name: 'Winter Season 1 Ultimate',
      asset_name: assetName,
      description: 'Forged from seasonal NFTs during Winter Season 1',
      image: 'ipfs://test',
      attributes: [
        { trait_type: 'Tier', value: 'seasonal_ultimate' },
        { trait_type: 'TierCode', value: typeCode },
        { trait_type: 'Season', value: 'Winter Season 1' },
        { trait_type: 'SeasonCode', value: seasonCode },
      ],
    };

    // Create Seasonal Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1seasonal',
      assetName,
      'seasonal',
      undefined, // No category for Seasonal Ultimate
      testSeasonId,
      metadata,
      typeCode
    );

    // Verify NFT was created with correct data
    const result = await pool.query(`
      SELECT 
        token_name,
        type_code,
        metadata,
        category_id,
        season_id,
        tier
      FROM player_nfts
      WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(1);
    const nft = result.rows[0];

    // Verify asset name format
    expect(nft.token_name).toBe(assetName);
    expect(validateAssetName(nft.token_name)).toBe(true);

    // Verify asset name matches pattern TNFT_V1_SEAS_{SeasonCode}_ULT_{id}
    const expectedPattern = `TNFT_V1_SEAS_${seasonCode}_ULT_${hexId}`;
    expect(nft.token_name).toBe(expectedPattern);

    // Verify tier
    expect(nft.tier).toBe('seasonal');

    // Verify no category is associated
    expect(nft.category_id).toBeNull();

    // Verify season is associated
    expect(nft.season_id).toBe(testSeasonId);

    // Verify type_code
    expect(nft.type_code).toBe('SEAS');

    // Verify metadata includes both asset_name and display_name
    const storedMetadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata;
    expect(storedMetadata.name).toBe('Winter Season 1 Ultimate');
    expect(storedMetadata.asset_name).toBe(assetName);
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'TierCode', value: typeCode });
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'SeasonCode', value: seasonCode });
  });

  it('should parse Seasonal Ultimate asset name correctly from database', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const seasonCode = 'SP1'; // Spring Season 1
    const assetName = buildAssetName({
      tier: 'seasonal_ultimate',
      seasonCode,
      id: hexId,
    });

    // Create Seasonal Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1seasonal',
      assetName,
      'seasonal',
      undefined,
      testSeasonId,
      { name: 'Test Seasonal Ultimate NFT' },
      'SEAS'
    );

    // Retrieve and parse
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const parsed = parseAssetName(result.rows[0].token_name);

    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('TNFT');
    expect(parsed?.version).toBe('V1');
    expect(parsed?.tier).toBe('SEAS');
    expect(parsed?.categoryCode).toBeUndefined();
    expect(parsed?.seasonCode).toBe(seasonCode);
    expect(parsed?.id).toBe(hexId);
  });

  it('should include season code in Seasonal Ultimate asset name', async () => {
    // Test different season codes
    const seasonCodes = ['WI1', 'SP1', 'SU1', 'FA1', 'WI2'];
    
    for (const seasonCode of seasonCodes) {
      const hexId = generateHexId();
      const assetName = buildAssetName({
        tier: 'seasonal_ultimate',
        seasonCode,
        id: hexId,
      });

      // Verify season code is in the asset name
      expect(assetName).toContain(seasonCode);
      expect(assetName).toMatch(new RegExp(`TNFT_V1_SEAS_${seasonCode}_ULT_[0-9a-f]{8}`));
    }
  });

  it('should not include category code in Seasonal Ultimate asset name', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const seasonCode = 'WI1';
    const assetName = buildAssetName({
      tier: 'seasonal_ultimate',
      seasonCode,
      id: hexId,
    });

    // Create Seasonal Ultimate NFT
    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1seasonal',
      assetName,
      'seasonal',
      undefined,
      testSeasonId,
      { name: 'Test Seasonal Ultimate NFT' },
      'SEAS'
    );

    // Retrieve asset name
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const tokenName = result.rows[0].token_name;

    // Verify no category codes are present
    const categoryCodesPattern = /(ARTS|ENT|GEO|HIST|MYTH|NAT|SCI|SPORT|TECH|WEIRD)/;
    expect(categoryCodesPattern.test(tokenName)).toBe(false);

    // Verify it follows the correct pattern
    expect(tokenName).toMatch(/^TNFT_V1_SEAS_WI1_ULT_[0-9a-f]{8}$/);
  });

  it('should handle multiple Seasonal Ultimate NFTs with unique asset names', async () => {
    // Create multiple Seasonal Ultimate NFTs
    const nfts = [];
    for (let i = 0; i < 3; i++) {
      const hexId = generateHexId();
      const seasonCode = 'WI1';
      const assetName = buildAssetName({
        tier: 'seasonal_ultimate',
        seasonCode,
        id: hexId,
      });

      await forgeService.createUltimateNFT(
        testStakeKey,
        'test_policy_id',
        `asset1seasonal${i}`,
        assetName,
        'seasonal',
        undefined,
        testSeasonId,
        { name: `Test Seasonal Ultimate NFT ${i}` },
        'SEAS'
      );

      nfts.push(assetName);
    }

    // Verify all NFTs were created with unique asset names
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(3);

    // Check uniqueness
    const assetNames = result.rows.map(row => row.token_name);
    const uniqueNames = new Set(assetNames);
    expect(uniqueNames.size).toBe(3);

    // Verify all follow correct format
    assetNames.forEach(name => {
      expect(validateAssetName(name)).toBe(true);
      expect(name).toMatch(/^TNFT_V1_SEAS_WI1_ULT_[0-9a-f]{8}$/);
    });
  });

  it('should differentiate between all four tier types', async () => {
    // Create a Category NFT
    const categoryHexId = generateHexId();
    const categoryCode = getCategoryCode('science' as any);
    const categoryAssetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: categoryHexId,
    });

    const scienceCategoryId = testCategories.find(c => c.slug === 'science')?.id;

    await pool.query(`
      INSERT INTO player_nfts (
        stake_key, policy_id, asset_fingerprint, token_name,
        source, category_id, tier, status, minted_at, metadata, type_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
    `, [
      testStakeKey, 'test_policy_id', 'asset1category', categoryAssetName,
      'mint', scienceCategoryId, 'category', 'confirmed',
      JSON.stringify({ name: 'Category NFT' }), 'REG'
    ]);

    // Create a Category Ultimate NFT
    const categoryUltimateHexId = generateHexId();
    const categoryUltimateAssetName = buildAssetName({
      tier: 'category_ultimate',
      categoryCode,
      id: categoryUltimateHexId,
    });

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1catult',
      categoryUltimateAssetName,
      'ultimate',
      scienceCategoryId,
      undefined,
      { name: 'Category Ultimate NFT' },
      'ULT'
    );

    // Create a Master Ultimate NFT
    const masterHexId = generateHexId();
    const masterAssetName = buildAssetName({
      tier: 'master_ultimate',
      id: masterHexId,
    });

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1master',
      masterAssetName,
      'master',
      undefined,
      undefined,
      { name: 'Master Ultimate NFT' },
      'MAST'
    );

    // Create a Seasonal Ultimate NFT
    const seasonalHexId = generateHexId();
    const seasonCode = 'WI1';
    const seasonalAssetName = buildAssetName({
      tier: 'seasonal_ultimate',
      seasonCode,
      id: seasonalHexId,
    });

    await forgeService.createUltimateNFT(
      testStakeKey,
      'test_policy_id',
      'asset1seasonal',
      seasonalAssetName,
      'seasonal',
      undefined,
      testSeasonId,
      { name: 'Seasonal Ultimate NFT' },
      'SEAS'
    );

    // Query all
    const result = await pool.query(`
      SELECT token_name, tier, type_code, category_id, season_id
      FROM player_nfts
      WHERE stake_key = $1
      ORDER BY tier
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(4);

    // Verify Category NFT
    const categoryNFT = result.rows[0];
    expect(categoryNFT.tier).toBe('category');
    expect(categoryNFT.token_name).toMatch(/^TNFT_V1_SCI_REG_[0-9a-f]{8}$/);
    expect(categoryNFT.type_code).toBe('REG');
    expect(categoryNFT.category_id).toBe(scienceCategoryId);
    expect(categoryNFT.season_id).toBeNull();

    // Verify Master Ultimate NFT
    const masterNFT = result.rows[1];
    expect(masterNFT.tier).toBe('master');
    expect(masterNFT.token_name).toMatch(/^TNFT_V1_MAST_[0-9a-f]{8}$/);
    expect(masterNFT.type_code).toBe('MAST');
    expect(masterNFT.category_id).toBeNull();
    expect(masterNFT.season_id).toBeNull();

    // Verify Seasonal Ultimate NFT
    const seasonalNFT = result.rows[2];
    expect(seasonalNFT.tier).toBe('seasonal');
    expect(seasonalNFT.token_name).toMatch(/^TNFT_V1_SEAS_WI1_ULT_[0-9a-f]{8}$/);
    expect(seasonalNFT.type_code).toBe('SEAS');
    expect(seasonalNFT.category_id).toBeNull();
    expect(seasonalNFT.season_id).toBe(testSeasonId);

    // Verify Category Ultimate NFT
    const categoryUltimateNFT = result.rows[3];
    expect(categoryUltimateNFT.tier).toBe('ultimate');
    expect(categoryUltimateNFT.token_name).toMatch(/^TNFT_V1_SCI_ULT_[0-9a-f]{8}$/);
    expect(categoryUltimateNFT.type_code).toBe('ULT');
    expect(categoryUltimateNFT.category_id).toBe(scienceCategoryId);
    expect(categoryUltimateNFT.season_id).toBeNull();
  });

  it('should create forge operation for Seasonal Ultimate with correct type', async () => {
    // Create 20 input NFTs from different categories (2 from each)
    const inputFingerprints: string[] = [];
    for (let i = 0; i < Math.min(20, testCategories.length * 2); i++) {
      const category = testCategories[i % testCategories.length];
      const hexId = generateHexId();
      const categoryCode = getCategoryCode(category.slug as any);
      const assetName = buildAssetName({
        tier: 'category',
        categoryCode,
        id: hexId,
      });

      await pool.query(`
        INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, tier, status, minted_at, metadata, type_code, season_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)
      `, [
        testStakeKey, 'test_policy_id', `asset1input${i}`, assetName,
        'mint', category.id, 'category', 'confirmed',
        JSON.stringify({ name: `Input NFT ${i}` }), 'REG', testSeasonId
      ]);

      inputFingerprints.push(`asset1input${i}`);
    }

    // Create forge operation for Seasonal Ultimate
    const forgeOp = await forgeService.createForgeOperation(
      'season',
      testStakeKey,
      inputFingerprints,
      undefined, // No category for Seasonal Ultimate
      testSeasonId
    );

    expect(forgeOp).toBeDefined();
    expect(forgeOp.type).toBe('season');
    expect(forgeOp.categoryId).toBeNull();
    expect(forgeOp.seasonId).toBe(testSeasonId);
    expect(forgeOp.inputFingerprints).toEqual(inputFingerprints);

    // Verify forge operation was created
    const result = await pool.query(`
      SELECT * FROM forge_operations WHERE id = $1
    `, [forgeOp.id]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].type).toBe('season');
    expect(result.rows[0].category_id).toBeNull();
    expect(result.rows[0].season_id).toBe(testSeasonId);
  });

  it('should support different season codes in asset names', async () => {
    // Test all season codes
    const seasonTests = [
      { code: 'WI1', name: 'Winter Season 1' },
      { code: 'SP1', name: 'Spring Season 1' },
      { code: 'SU1', name: 'Summer Season 1' },
      { code: 'FA1', name: 'Fall Season 1' },
      { code: 'WI2', name: 'Winter Season 2' },
    ];

    for (const season of seasonTests) {
      const hexId = generateHexId();
      const assetName = buildAssetName({
        tier: 'seasonal_ultimate',
        seasonCode: season.code,
        id: hexId,
      });

      // Verify format
      expect(assetName).toBe(`TNFT_V1_SEAS_${season.code}_ULT_${hexId}`);
      expect(validateAssetName(assetName)).toBe(true);

      // Verify parsing
      const parsed = parseAssetName(assetName);
      expect(parsed).not.toBeNull();
      expect(parsed?.seasonCode).toBe(season.code);
      expect(parsed?.tier).toBe('SEAS');
    }
  });
});
