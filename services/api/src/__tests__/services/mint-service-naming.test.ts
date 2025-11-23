/**
 * Integration test for Minting Service with New Naming Convention
 * Tests that Category NFTs are minted with correct asset names
 * 
 * Requirements: 5.1-5.6
 * Validates: Property 6 (Tier 1 format correctness)
 * 
 * NOTE: These tests are currently skipped because they require database admin privileges
 * to create/drop test databases. Neon (managed PostgreSQL) doesn't support CREATE DATABASE.
 * These tests can be run in CI/CD with a local PostgreSQL instance or Docker.
 * The core naming logic is thoroughly tested in the shared package unit tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { MintService } from '../../services/mint-service';
import { 
  buildAssetName, 
  parseAssetName, 
  validateAssetName, 
  generateHexId, 
  getCategoryCode 
} from '@trivia-nft/shared';

describe('Mint Service with New Naming Convention', () => {
  let pool: Pool;
  let mintService: MintService;
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

    // Create mint service
    mintService = new MintService(pool);

    // Set up test data
    const categoryResult = await pool.query(`
      SELECT id, slug FROM categories WHERE slug = 'science' LIMIT 1
    `);
    testCategoryId = categoryResult.rows[0].id;
    testCategorySlug = categoryResult.rows[0].slug;

    // Create test player
    testStakeKey = `stake_test_mint_${Date.now()}`;
    await pool.query(`
      INSERT INTO players (stake_key, username, created_at)
      VALUES ($1, $2, NOW())
    `, [testStakeKey, 'test_mint_player']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM mints WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM players WHERE stake_key = $1', [testStakeKey]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM player_nfts WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM mints WHERE stake_key = $1', [testStakeKey]);
  });

  it('should create player NFT with correct asset name format', async () => {
    // Generate asset name components
    const hexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const assetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: hexId,
    });
    const typeCode = 'REG';

    // Create test metadata
    const metadata = {
      name: 'Test Science NFT',
      asset_name: assetName,
      description: 'A test NFT',
      image: 'ipfs://test',
      attributes: [
        { trait_type: 'Category', value: 'Science' },
        { trait_type: 'CategoryCode', value: categoryCode },
        { trait_type: 'TierCode', value: typeCode },
      ],
    };

    // Create player NFT
    await mintService.createPlayerNFT(
      testStakeKey,
      'test_policy_id',
      'asset1test',
      assetName,
      testCategoryId,
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

    // Verify asset name matches pattern TNFT_V1_{CAT}_REG_{id}
    const expectedPattern = `TNFT_V1_${categoryCode}_REG_${hexId}`;
    expect(nft.token_name).toBe(expectedPattern);

    // Verify type code
    expect(nft.type_code).toBe('REG');

    // Verify metadata includes both asset_name and display_name
    const storedMetadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata;
    expect(storedMetadata.name).toBe('Test Science NFT');
    expect(storedMetadata.asset_name).toBe(assetName);
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'CategoryCode', value: categoryCode });
    expect(storedMetadata.attributes).toContainEqual({ trait_type: 'TierCode', value: typeCode });
  });

  it('should parse asset name correctly from database', async () => {
    // Generate asset name
    const hexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const assetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: hexId,
    });

    // Create player NFT
    await mintService.createPlayerNFT(
      testStakeKey,
      'test_policy_id',
      'asset1test',
      assetName,
      testCategoryId,
      { name: 'Test NFT' },
      'REG'
    );

    // Retrieve and parse
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    const parsed = parseAssetName(result.rows[0].token_name);

    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('TNFT');
    expect(parsed?.version).toBe('V1');
    expect(parsed?.tier).toBe('REG');
    expect(parsed?.categoryCode).toBe(categoryCode);
    expect(parsed?.id).toBe(hexId);
  });

  it('should handle multiple NFTs with unique asset names', async () => {
    // Create multiple NFTs
    const nfts = [];
    for (let i = 0; i < 5; i++) {
      const hexId = generateHexId();
      const categoryCode = getCategoryCode(testCategorySlug as any);
      const assetName = buildAssetName({
        tier: 'category',
        categoryCode,
        id: hexId,
      });

      await mintService.createPlayerNFT(
        testStakeKey,
        'test_policy_id',
        `asset1test${i}`,
        assetName,
        testCategoryId,
        { name: `Test NFT ${i}` },
        'REG'
      );

      nfts.push(assetName);
    }

    // Verify all NFTs were created with unique asset names
    const result = await pool.query(`
      SELECT token_name FROM player_nfts WHERE stake_key = $1
    `, [testStakeKey]);

    expect(result.rows).toHaveLength(5);

    // Check uniqueness
    const assetNames = result.rows.map(row => row.token_name);
    const uniqueNames = new Set(assetNames);
    expect(uniqueNames.size).toBe(5);

    // Verify all follow correct format
    assetNames.forEach(name => {
      expect(validateAssetName(name)).toBe(true);
      expect(name).toMatch(/^TNFT_V1_SCI_REG_[0-9a-f]{8}$/);
    });
  });

  it('should store type_code for quick tier filtering', async () => {
    // Create NFT
    const hexId = generateHexId();
    const categoryCode = getCategoryCode(testCategorySlug as any);
    const assetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: hexId,
    });

    await mintService.createPlayerNFT(
      testStakeKey,
      'test_policy_id',
      'asset1test',
      assetName,
      testCategoryId,
      { name: 'Test NFT' },
      'REG'
    );

    // Query by type_code for this test's stake key
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM player_nfts
      WHERE type_code = 'REG' AND stake_key = $1
    `, [testStakeKey]);

    expect(parseInt(result.rows[0].count)).toBe(1);
  });
});


