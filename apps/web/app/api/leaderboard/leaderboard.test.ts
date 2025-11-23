/**
 * Tests for leaderboard API endpoints
 * 
 * Task 18.7: Test leaderboard endpoints
 * - Test global leaderboard
 * - Test category leaderboard
 * - Test season leaderboard
 * - Verify ranking calculations
 * Requirements: 9.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, getPool } from '../../../../../services/api/src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Leaderboard Endpoints', () => {
  let testSeasonId: string;
  let testCategoryId: string;
  let testPlayerIds: string[] = [];
  let testStakeKeys: string[] = [];

  beforeAll(async () => {
    // Get or create test season
    const seasonResult = await query(
      `SELECT id FROM seasons WHERE id = 'winter-s1'`
    );
    
    if (seasonResult.rows.length > 0) {
      testSeasonId = seasonResult.rows[0].id;
    } else {
      testSeasonId = 'winter-s1';
      await query(
        `INSERT INTO seasons (id, name, starts_at, ends_at)
         VALUES ($1, $2, $3, $4)`,
        [
          testSeasonId,
          'Winter Season 1',
          new Date('2024-01-01').toISOString(),
          new Date('2025-12-31').toISOString(),
        ]
      );
    }

    // Get test category
    const categoryResult = await query(
      `SELECT id FROM categories LIMIT 1`
    );
    testCategoryId = categoryResult.rows[0]?.id || uuidv4();

    // Create test players with different scores
    for (let i = 0; i < 5; i++) {
      const stakeKey = `stake1u8pcjgmx7962w6hey5hhsd502araxp26kdtgagakhaqtq8squng8${i}`;
      testStakeKeys.push(stakeKey);

      const playerResult = await query(
        `INSERT INTO players (stake_key, last_seen_at)
         VALUES ($1, NOW())
         RETURNING id`,
        [stakeKey]
      );
      testPlayerIds.push(playerResult.rows[0].id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    const pool = await getPool();
    await pool.query('DELETE FROM sessions WHERE player_id = ANY($1)', [testPlayerIds]);
    await pool.query('DELETE FROM players WHERE id = ANY($1)', [testPlayerIds]);
  });

  describe('GET /api/leaderboard/global', () => {
    it('should return global leaderboard', async () => {
      const { GET } = await import('./global/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('seasonId');
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('should return leaderboard with pagination', async () => {
      const { GET } = await import('./global/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            limit: '5',
            offset: '0',
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries.length).toBeLessThanOrEqual(5);
    });

    it('should return leaderboard for specific season', async () => {
      const { GET } = await import('./global/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            seasonId: testSeasonId,
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seasonId).toBe(testSeasonId);
    });

    it('should reject invalid limit parameter', async () => {
      const { GET } = await import('./global/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            limit: '200', // Over max of 100
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should reject negative offset parameter', async () => {
      const { GET } = await import('./global/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            offset: '-1',
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/leaderboard/category/[categoryId]', () => {
    it('should return category leaderboard', async () => {
      const { GET } = await import('./category/[categoryId]/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any;

      const response = await GET(mockRequest, { params: { categoryId: testCategoryId } });
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('categoryId');
      expect(data).toHaveProperty('seasonId');
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('total');
      expect(data.categoryId).toBe(testCategoryId);
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('should return category leaderboard with pagination', async () => {
      const { GET } = await import('./category/[categoryId]/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            limit: '10',
            offset: '0',
          }),
        },
      } as any;

      const response = await GET(mockRequest, { params: { categoryId: testCategoryId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/leaderboard/season/[seasonId]', () => {
    it('should return season leaderboard', async () => {
      const { GET } = await import('./season/[seasonId]/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any;

      const response = await GET(mockRequest, { params: { seasonId: testSeasonId } });
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('seasonId');
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('total');
      expect(data.seasonId).toBe(testSeasonId);
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('should return 404 for non-existent season', async () => {
      const { GET } = await import('./season/[seasonId]/route');

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any;

      const response = await GET(mockRequest, { params: { seasonId: 'non-existent-season' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Leaderboard Ranking Verification', () => {
    it('should rank players by points correctly', async () => {
      // Create sessions with different scores for ranking
      for (let i = 0; i < testPlayerIds.length; i++) {
        const score = (i + 1) * 2; // 2, 4, 6, 8, 10
        await query(
          `INSERT INTO sessions (id, player_id, stake_key, category_id, status, started_at, ended_at, score, total_ms)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)`,
          [
            uuidv4(),
            testPlayerIds[i],
            testStakeKeys[i],
            testCategoryId,
            score >= 6 ? 'won' : 'lost',
            score,
            10000,
          ]
        );
      }

      const { GET } = await import('./global/route');
      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            seasonId: testSeasonId,
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify rankings are in descending order by points
      if (data.entries.length > 1) {
        for (let i = 0; i < data.entries.length - 1; i++) {
          expect(data.entries[i].points).toBeGreaterThanOrEqual(data.entries[i + 1].points);
        }
      }
    });
  });
});
