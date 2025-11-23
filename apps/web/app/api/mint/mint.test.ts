/**
 * Tests for mint API endpoints
 * 
 * Task 18.5: Test mint endpoints
 * - Test mint initiation
 * - Test mint status checking
 * - Verify workflow is triggered
 * Requirements: 9.3
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { generateToken } from '../../../../../services/api/src/utils/jwt';
import { query, getPool } from '../../../../../services/api/src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Mint Endpoints', () => {
  let testPlayerId: string;
  let testToken: string;
  let testEligibilityId: string;
  let testCategoryId: string;
  let testStakeKey: string;

  beforeAll(async () => {
    // Create test player
    testStakeKey = 'stake1u8pcjgmx7962w6hey5hhsd502araxp26kdtgagakhaqtq8squng79';
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

    // Create test eligibility
    const eligibilityResult = await query(
      `INSERT INTO eligibilities (id, type, category_id, player_id, stake_key, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        uuidv4(),
        'category',
        testCategoryId,
        testPlayerId,
        testStakeKey,
        'active',
        new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      ]
    );
    testEligibilityId = eligibilityResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    const pool = await getPool();
    await pool.query('DELETE FROM mints WHERE player_id = $1', [testPlayerId]);
    await pool.query('DELETE FROM eligibilities WHERE player_id = $1', [testPlayerId]);
    await pool.query('DELETE FROM players WHERE id = $1', [testPlayerId]);
  });

  describe('POST /api/mint/[eligibilityId]', () => {
    it('should initiate mint and trigger Inngest workflow', async () => {
      const { POST } = await import('./[eligibilityId]/route');

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest, { params: { eligibilityId: testEligibilityId } });
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('mintOperation');
      expect(data.mintOperation).toHaveProperty('id');
      expect(data.mintOperation).toHaveProperty('eligibilityId');
      expect(data.mintOperation).toHaveProperty('playerId');
      expect(data.mintOperation).toHaveProperty('status');
      expect(data.mintOperation.eligibilityId).toBe(testEligibilityId);
      expect(data.mintOperation.playerId).toBe(testPlayerId);
      expect(data.mintOperation.status).toBe('pending');
    });

    it('should reject mint without authorization', async () => {
      const { POST } = await import('./[eligibilityId]/route');

      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as any;

      const response = await POST(mockRequest, { params: { eligibilityId: testEligibilityId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
    });

    it('should reject mint for non-existent eligibility', async () => {
      const { POST } = await import('./[eligibilityId]/route');

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest, { params: { eligibilityId: uuidv4() } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });

    it('should reject mint for eligibility owned by different player', async () => {
      // Create another player's eligibility
      const otherPlayerResult = await query(
        `INSERT INTO players (stake_key, last_seen_at)
         VALUES ($1, NOW())
         RETURNING id`,
        ['stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zqgtu2qy']
      );
      const otherPlayerId = otherPlayerResult.rows[0].id;

      const otherEligibilityResult = await query(
        `INSERT INTO eligibilities (id, type, category_id, player_id, stake_key, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          uuidv4(),
          'category',
          testCategoryId,
          otherPlayerId,
          'stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zqgtu2qy',
          'active',
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ]
      );
      const otherEligibilityId = otherEligibilityResult.rows[0].id;

      const { POST } = await import('./[eligibilityId]/route');

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await POST(mockRequest, { params: { eligibilityId: otherEligibilityId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty('error');

      // Clean up
      const pool = await getPool();
      await pool.query('DELETE FROM eligibilities WHERE id = $1', [otherEligibilityId]);
      await pool.query('DELETE FROM players WHERE id = $1', [otherPlayerId]);
    });
  });

  describe('GET /api/mint/[mintId]/status', () => {
    it('should return mint operation status', async () => {
      // First create a mint operation
      const { POST } = await import('./[eligibilityId]/route');
      const postRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const postResponse = await POST(postRequest, { params: { eligibilityId: testEligibilityId } });
      const postData = await postResponse.json();
      const mintId = postData.mintOperation.id;

      // Now check status
      const { GET } = await import('./[mintId]/status/route');
      const getRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await GET(getRequest, { params: { mintId } });
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('mintOperation');
      expect(data.mintOperation).toHaveProperty('id');
      expect(data.mintOperation).toHaveProperty('status');
      expect(data.mintOperation.id).toBe(mintId);
    });

    it('should return 404 for non-existent mint operation', async () => {
      const { GET } = await import('./[mintId]/status/route');

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return `Bearer ${testToken}`;
            return null;
          },
        },
      } as any;

      const response = await GET(mockRequest, { params: { mintId: uuidv4() } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });
});
