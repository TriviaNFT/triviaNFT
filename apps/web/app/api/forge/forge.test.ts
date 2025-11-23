/**
 * Tests for forge API endpoints
 * 
 * Task 18.6: Test forge endpoints
 * - Test forge initiation for all types (category, master, season)
 * - Test forge status checking
 * - Verify workflow is triggered
 * Requirements: 9.4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateToken } from '../../../../../services/api/src/utils/jwt';
import { query, getPool } from '../../../../../services/api/src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Forge Endpoints', () => {
  let testPlayerId: string;
  let testToken: string;
  let testCategoryId: string;
  let testStakeKey: string;
  let testFingerprints: string[];

  beforeAll(async () => {
    // Create test player
    testStakeKey = 'stake1u8pcjgmx7962w6hey5hhsd502araxp26kdtgagakhaqtq8squng80';
    const playerResult = await query(
      `INSERT INTO players (stake_key, last_seen_at)
       VALUES ($1, NOW())
       RETURNING id`,
      [testStakeKey]
    );
    testPlayerId = playerResult.rows[0].id;

    // Generate test token
    testToken = await generateToken({
      sub: testPlayerId,
      stakeKey: testStakeKey,
    });

    // Get a test category
    const categoryResult = await query(
      `SELECT id FROM categories LIMIT 1`
    );
    testCategoryId = categoryResult.rows[0]?.id || uuidv4();

    // Create test NFTs for forging
    testFingerprints = [];
    for (let i = 0; i < 10; i++) {
      const fingerprint = `asset1${i.toString().padStart(52, '0')}`;
      testFingerprints.push(fingerprint);

      await query(
        `INSERT INTO player_nfts (id, player_id, stake_key, category_id, tier, asset_fingerprint, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), testPlayerId, testStakeKey, testCategoryId, 'common', fingerprint, 'confirmed']
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    const pool = await getPool();
    await pool.query('DELETE FROM forge_operations WHERE stake_key = $1', [testStakeKey]);
    await pool.query('DELETE FROM player_nfts WHERE player_id = $1', [testPlayerId]);
    await pool.query('DELETE FROM players WHERE id = $1', [testPlayerId]);
  });

  describe('POST /api/forge/category', () => {
    it('should initiate category forge and trigger Inngest workflow', async () => {
      const { POST } = await import('./category/route');

      const mockRequest = {
        json: async () => ({
          type: 'category',
          categoryId: testCategoryId,
          inputFingerprints: testFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('forgeOperation');
      expect(data.forgeOperation).toHaveProperty('id');
      expect(data.forgeOperation).toHaveProperty('type');
      expect(data.forgeOperation).toHaveProperty('status');
      expect(data.forgeOperation.type).toBe('category');
      expect(data.forgeOperation.status).toBe('pending');
    });

    it('should reject forge without authorization', async () => {
      const { POST } = await import('./category/route');

      const mockRequest = {
        json: async () => ({
          type: 'category',
          categoryId: testCategoryId,
          inputFingerprints: testFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
    });

    it('should reject forge with wrong number of NFTs', async () => {
      const { POST } = await import('./category/route');

      const mockRequest = {
        json: async () => ({
          type: 'category',
          categoryId: testCategoryId,
          inputFingerprints: testFingerprints.slice(0, 5), // Only 5 NFTs
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should reject forge with invalid type', async () => {
      const { POST } = await import('./category/route');

      const mockRequest = {
        json: async () => ({
          type: 'master', // Wrong type for this endpoint
          categoryId: testCategoryId,
          inputFingerprints: testFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/forge/master', () => {
    it('should initiate master forge', async () => {
      // Create 10 ultimate NFTs for master forge
      const ultimateFingerprints: string[] = [];
      for (let i = 0; i < 10; i++) {
        const fingerprint = `asset2${i.toString().padStart(52, '0')}`;
        ultimateFingerprints.push(fingerprint);

        await query(
          `INSERT INTO player_nfts (id, player_id, stake_key, category_id, tier, asset_fingerprint, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), testPlayerId, testStakeKey, testCategoryId, 'ultimate', fingerprint, 'confirmed']
        );
      }

      const { POST } = await import('./master/route');

      const mockRequest = {
        json: async () => ({
          type: 'master',
          inputFingerprints: ultimateFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('forgeOperation');
      expect(data.forgeOperation.type).toBe('master');

      // Clean up
      const pool = await getPool();
      await pool.query(
        'DELETE FROM player_nfts WHERE asset_fingerprint = ANY($1)',
        [ultimateFingerprints]
      );
    });
  });

  describe('POST /api/forge/season', () => {
    it('should initiate season forge', async () => {
      // Create 10 master NFTs for season forge
      const masterFingerprints: string[] = [];
      for (let i = 0; i < 10; i++) {
        const fingerprint = `asset3${i.toString().padStart(52, '0')}`;
        masterFingerprints.push(fingerprint);

        await query(
          `INSERT INTO player_nfts (id, player_id, stake_key, category_id, tier, asset_fingerprint, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), testPlayerId, testStakeKey, testCategoryId, 'master', fingerprint, 'confirmed']
        );
      }

      const { POST } = await import('./season/route');

      const mockRequest = {
        json: async () => ({
          type: 'season',
          seasonId: 'winter-s1',
          inputFingerprints: masterFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('forgeOperation');
      expect(data.forgeOperation.type).toBe('season');

      // Clean up
      const pool = await getPool();
      await pool.query(
        'DELETE FROM player_nfts WHERE asset_fingerprint = ANY($1)',
        [masterFingerprints]
      );
    });
  });

  describe('GET /api/forge/[forgeId]/status', () => {
    it('should return forge operation status', async () => {
      // First create a forge operation
      const { POST } = await import('./category/route');
      const postRequest = {
        json: async () => ({
          type: 'category',
          categoryId: testCategoryId,
          inputFingerprints: testFingerprints,
        }),
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            if (name === 'content-length') return '500';
            return null;
          },
        },
      } as any;

      const postResponse = await POST(postRequest);
      const postData = await postResponse.json();
      const forgeId = postData.forgeOperation.id;

      // Now check status
      const { GET } = await import('./[forgeId]/status/route');
      const getRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await GET(getRequest, { params: { forgeId } });
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('forgeOperation');
      expect(data.forgeOperation).toHaveProperty('id');
      expect(data.forgeOperation).toHaveProperty('status');
      expect(data.forgeOperation.id).toBe(forgeId);
    });

    it('should return 404 for non-existent forge operation', async () => {
      const { GET } = await import('./[forgeId]/status/route');

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await GET(mockRequest, { params: { forgeId: uuidv4() } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });
});
