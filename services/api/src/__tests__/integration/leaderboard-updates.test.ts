/**
 * Integration Tests: Leaderboard Updates
 * 
 * Tests leaderboard functionality including:
 * - Points calculation after session
 * - Tie-breaker logic
 * - Redis ZSET updates
 * - Leaderboard pagination
 * - Season points in Aurora
 * 
 * Requirements: 21, 22, 25
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { LeaderboardService } from '../../services/leaderboard-service.js';
import { RedisService } from '../../services/redis-service.js';
import { query } from '../../db/connection.js';

describe('Leaderboard Updates Integration Tests', () => {
  let leaderboardService: LeaderboardService;
  let redisService: RedisService;
  let testSeasonId: string;
  let testCategoryId: string;
  let testPlayers: Array<{ id: string; stakeKey: string; username: string }> = [];

  beforeAll(async () => {
    leaderboardService = new LeaderboardService();
    redisService = new RedisService();

    // Create test season
    const seasonResult = await query(
      `INSERT INTO seasons (name, starts_at, ends_at, grace_days, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'Leaderboard Test Season',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        7,
        true,
      ]
    );
    testSeasonId = seasonResult.rows[0].id;

    // Create test category
    const categoryResult = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Leaderboard Test Category', 'Category for leaderboard tests', true]
    );
    testCategoryId = categoryResult.rows[0].id;

    // Create test players
    for (let i = 0; i < 5; i++) {
      const stakeKey = `stake1test${uuidv4().replace(/-/g, '').substring(0, 49)}`;
      const username = `leadertest_${i + 1}_${Date.now()}`;

      const playerResult = await query(
        `INSERT INTO players (stake_key, username, last_seen_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [stakeKey, username]
      );

      testPlayers.push({
        id: playerResult.rows[0].id,
        stakeKey,
        username,
      });
    }
  });

  afterAll(async () => {
    // Clean up Redis leaderboards
    const client = await (redisService as any).getClient();
    await client.del(`ladder:global:${testSeasonId}`);
    await client.del(`ladder:category:${testCategoryId}:${testSeasonId}`);

    // Clean up database
    await query('DELETE FROM season_points WHERE season_id = $1', [testSeasonId]);
    await query('DELETE FROM sessions WHERE category_id = $1', [testCategoryId]);
    await query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
    await query('DELETE FROM seasons WHERE id = $1', [testSeasonId]);

    for (const player of testPlayers) {
      await query('DELETE FROM players WHERE id = $1', [player.id]);
    }
  });

  beforeEach(async () => {
    // Clear leaderboards before each test
    const client = await (redisService as any).getClient();
    await client.del(`ladder:global:${testSeasonId}`);
    await client.del(`ladder:category:${testCategoryId}:${testSeasonId}`);

    // Clear season points
    await query('DELETE FROM season_points WHERE season_id = $1', [testSeasonId]);
  });

  describe('Points Calculation', () => {
    it('should calculate points correctly after session', async () => {
      const player = testPlayers[0];
      const pointsToAdd = 20; // 10 correct answers + 10 bonus for perfect score

      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        pointsToAdd,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Verify in Aurora
      const result = await query(
        `SELECT points, perfects, avg_answer_ms, sessions_used
         FROM season_points
         WHERE season_id = $1 AND stake_key = $2`,
        [testSeasonId, player.stakeKey]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].points).toBe(20);
      expect(result.rows[0].perfects).toBe(1);
      expect(result.rows[0].avg_answer_ms).toBe(5000);
      expect(result.rows[0].sessions_used).toBe(1);
    });

    it('should accumulate points across multiple sessions', async () => {
      const player = testPlayers[0];

      // First session: 20 points (perfect score)
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Second session: 7 points (7 correct, no bonus)
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        7,
        {
          perfectScores: 0,
          avgAnswerTime: 6000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Verify accumulated points
      const result = await query(
        `SELECT points, perfects, sessions_used
         FROM season_points
         WHERE season_id = $1 AND stake_key = $2`,
        [testSeasonId, player.stakeKey]
      );

      expect(result.rows[0].points).toBe(27); // 20 + 7
      expect(result.rows[0].perfects).toBe(1); // Only 1 perfect
      expect(result.rows[0].sessions_used).toBe(2);
    });

    it('should calculate average answer time correctly', async () => {
      const player = testPlayers[0];

      // First session: 5000ms average
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        10,
        {
          perfectScores: 0,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Second session: 7000ms average
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        10,
        {
          perfectScores: 0,
          avgAnswerTime: 7000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Verify average: (5000 + 7000) / 2 = 6000
      const result = await query(
        `SELECT avg_answer_ms FROM season_points
         WHERE season_id = $1 AND stake_key = $2`,
        [testSeasonId, player.stakeKey]
      );

      expect(result.rows[0].avg_answer_ms).toBe(6000);
    });
  });

  describe('Tie-Breaker Logic', () => {
    it('should rank players with same points by NFTs minted', async () => {
      const player1 = testPlayers[0];
      const player2 = testPlayers[1];

      // Both players have 20 points
      await leaderboardService.updatePlayerPoints(
        player1.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 2, // Player 1 has more NFTs
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        player2.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 1, // Player 2 has fewer NFTs
          firstAchievedAt: new Date(),
        }
      );

      // Get leaderboard
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries).toHaveLength(2);
      expect(leaderboard.entries[0].stakeKey).toBe(player1.stakeKey); // Player 1 should be first
      expect(leaderboard.entries[0].nftsMinted).toBe(2);
      expect(leaderboard.entries[1].stakeKey).toBe(player2.stakeKey);
      expect(leaderboard.entries[1].nftsMinted).toBe(1);
    });

    it('should rank players with same points and NFTs by perfect scores', async () => {
      const player1 = testPlayers[0];
      const player2 = testPlayers[1];

      // Both have 20 points and 1 NFT
      await leaderboardService.updatePlayerPoints(
        player1.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 2, // Player 1 has more perfect scores
          avgAnswerTime: 5000,
          sessionsUsed: 2,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        player2.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1, // Player 2 has fewer perfect scores
          avgAnswerTime: 5000,
          sessionsUsed: 2,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries[0].stakeKey).toBe(player1.stakeKey);
      expect(leaderboard.entries[0].perfectScores).toBe(2);
      expect(leaderboard.entries[1].stakeKey).toBe(player2.stakeKey);
      expect(leaderboard.entries[1].perfectScores).toBe(1);
    });

    it('should rank players with same points, NFTs, and perfects by average time', async () => {
      const player1 = testPlayers[0];
      const player2 = testPlayers[1];

      // Both have 20 points, 1 NFT, 1 perfect
      await leaderboardService.updatePlayerPoints(
        player1.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 4000, // Player 1 is faster
          sessionsUsed: 1,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        player2.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 6000, // Player 2 is slower
          sessionsUsed: 1,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries[0].stakeKey).toBe(player1.stakeKey);
      expect(leaderboard.entries[0].avgAnswerTime).toBe(4000);
      expect(leaderboard.entries[1].stakeKey).toBe(player2.stakeKey);
      expect(leaderboard.entries[1].avgAnswerTime).toBe(6000);
    });

    it('should rank players by sessions used when all else equal', async () => {
      const player1 = testPlayers[0];
      const player2 = testPlayers[1];

      await leaderboardService.updatePlayerPoints(
        player1.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1, // Player 1 used fewer sessions
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        player2.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 2, // Player 2 used more sessions
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries[0].stakeKey).toBe(player1.stakeKey);
      expect(leaderboard.entries[0].sessionsUsed).toBe(1);
      expect(leaderboard.entries[1].stakeKey).toBe(player2.stakeKey);
      expect(leaderboard.entries[1].sessionsUsed).toBe(2);
    });
  });

  describe('Redis ZSET Updates', () => {
    it('should update Redis sorted set with composite score', async () => {
      const player = testPlayers[0];

      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      // Verify in Redis
      const client = await (redisService as any).getClient();
      const leaderboardKey = `ladder:global:${testSeasonId}`;
      const score = await client.zScore(leaderboardKey, player.stakeKey);

      expect(score).toBeDefined();
      expect(score).toBeGreaterThan(0);
    });

    it('should maintain correct order in Redis ZSET', async () => {
      // Add players with different scores
      await leaderboardService.updatePlayerPoints(
        testPlayers[0].stakeKey,
        testSeasonId,
        30,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        testPlayers[1].stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      await leaderboardService.updatePlayerPoints(
        testPlayers[2].stakeKey,
        testSeasonId,
        25,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Get leaderboard
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries).toHaveLength(3);
      expect(leaderboard.entries[0].points).toBe(30); // Highest
      expect(leaderboard.entries[1].points).toBe(25); // Middle
      expect(leaderboard.entries[2].points).toBe(20); // Lowest
    });
  });

  describe('Leaderboard Pagination', () => {
    beforeEach(async () => {
      // Add 5 players to leaderboard
      for (let i = 0; i < 5; i++) {
        await leaderboardService.updatePlayerPoints(
          testPlayers[i].stakeKey,
          testSeasonId,
          (5 - i) * 10, // Descending points: 50, 40, 30, 20, 10
          {
            perfectScores: 1,
            avgAnswerTime: 5000,
            sessionsUsed: 1,
            nftsMinted: 0,
            firstAchievedAt: new Date(),
          }
        );
      }
    });

    it('should return correct page with limit', async () => {
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 3, 0);

      expect(leaderboard.entries).toHaveLength(3);
      expect(leaderboard.total).toBe(5);
      expect(leaderboard.hasMore).toBe(true);
      expect(leaderboard.entries[0].points).toBe(50);
      expect(leaderboard.entries[1].points).toBe(40);
      expect(leaderboard.entries[2].points).toBe(30);
    });

    it('should return correct page with offset', async () => {
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 2, 2);

      expect(leaderboard.entries).toHaveLength(2);
      expect(leaderboard.total).toBe(5);
      expect(leaderboard.hasMore).toBe(true);
      expect(leaderboard.entries[0].points).toBe(30); // 3rd place
      expect(leaderboard.entries[1].points).toBe(20); // 4th place
    });

    it('should indicate no more pages when at end', async () => {
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries).toHaveLength(5);
      expect(leaderboard.total).toBe(5);
      expect(leaderboard.hasMore).toBe(false);
    });

    it('should assign correct ranks', async () => {
      const leaderboard = await leaderboardService.getGlobalLeaderboard(testSeasonId, 10, 0);

      expect(leaderboard.entries[0].rank).toBe(1);
      expect(leaderboard.entries[1].rank).toBe(2);
      expect(leaderboard.entries[2].rank).toBe(3);
      expect(leaderboard.entries[3].rank).toBe(4);
      expect(leaderboard.entries[4].rank).toBe(5);
    });
  });

  describe('Category Leaderboard', () => {
    beforeEach(async () => {
      // Create sessions for category leaderboard
      for (let i = 0; i < 3; i++) {
        const player = testPlayers[i];
        const sessionId = uuidv4();

        await query(
          `INSERT INTO sessions (
            id, player_id, stake_key, category_id, status, 
            started_at, ended_at, score, total_ms, questions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            sessionId,
            player.id,
            player.stakeKey,
            testCategoryId,
            'won',
            new Date(Date.now() - 60000).toISOString(),
            new Date().toISOString(),
            10 - i, // Descending scores: 10, 9, 8
            50000,
            JSON.stringify([]),
          ]
        );

        // Update category leaderboard
        await leaderboardService.updateCategoryLeaderboard(
          player.stakeKey,
          testCategoryId,
          testSeasonId
        );
      }
    });

    it('should update category leaderboard', async () => {
      const leaderboard = await leaderboardService.getCategoryLeaderboard(
        testCategoryId,
        testSeasonId,
        10,
        0
      );

      expect(leaderboard.entries).toHaveLength(3);
      expect(leaderboard.entries[0].points).toBe(10); // Highest score
      expect(leaderboard.entries[1].points).toBe(9);
      expect(leaderboard.entries[2].points).toBe(8);
    });

    it('should calculate category-specific stats', async () => {
      const leaderboard = await leaderboardService.getCategoryLeaderboard(
        testCategoryId,
        testSeasonId,
        10,
        0
      );

      const topEntry = leaderboard.entries[0];
      expect(topEntry.sessionsUsed).toBe(1);
      expect(topEntry.avgAnswerTime).toBeGreaterThan(0);
    });
  });

  describe('Season Points Persistence', () => {
    it('should persist season points in Aurora', async () => {
      const player = testPlayers[0];

      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        20,
        {
          perfectScores: 1,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      const result = await query(
        `SELECT * FROM season_points 
         WHERE season_id = $1 AND stake_key = $2`,
        [testSeasonId, player.stakeKey]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].points).toBe(20);
      expect(result.rows[0].perfects).toBe(1);
      expect(result.rows[0].minted_count).toBe(1);
      expect(result.rows[0].avg_answer_ms).toBe(5000);
      expect(result.rows[0].sessions_used).toBe(1);
      expect(result.rows[0].first_achieved_at).toBeDefined();
    });

    it('should update existing season points record', async () => {
      const player = testPlayers[0];

      // First update
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        10,
        {
          perfectScores: 0,
          avgAnswerTime: 5000,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: new Date(),
        }
      );

      // Second update
      await leaderboardService.updatePlayerPoints(
        player.stakeKey,
        testSeasonId,
        10,
        {
          perfectScores: 1,
          avgAnswerTime: 6000,
          sessionsUsed: 1,
          nftsMinted: 1,
          firstAchievedAt: new Date(),
        }
      );

      const result = await query(
        `SELECT * FROM season_points 
         WHERE season_id = $1 AND stake_key = $2`,
        [testSeasonId, player.stakeKey]
      );

      // Should only have one record (upsert)
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].points).toBe(20); // 10 + 10
      expect(result.rows[0].perfects).toBe(1); // 0 + 1
      expect(result.rows[0].minted_count).toBe(1); // 0 + 1
      expect(result.rows[0].sessions_used).toBe(2); // 1 + 1
    });
  });
});
