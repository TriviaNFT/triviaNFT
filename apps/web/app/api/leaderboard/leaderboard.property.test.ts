/**
 * Property-based tests for leaderboard endpoints
 * 
 * Task 18.8: Write property test for leaderboard ranking
 * 
 * Property 9: Leaderboard Ranking Correctness
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { LeaderboardService } from '../../../../../services/api/src/services/leaderboard-service';
import { query, getPool } from '../../../../../services/api/src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Property-Based Tests: Leaderboard Endpoints', () => {
  let testSeasonId: string;
  let createdPlayerIds: string[] = [];
  let createdStakeKeys: string[] = [];

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
  });

  afterAll(async () => {
    // Clean up all created test players
    const pool = await getPool();
    if (createdPlayerIds.length > 0) {
      await pool.query(
        'DELETE FROM sessions WHERE player_id = ANY($1)',
        [createdPlayerIds]
      );
      await pool.query(
        'DELETE FROM players WHERE id = ANY($1)',
        [createdPlayerIds]
      );
    }
  });

  /**
   * Property 9: Leaderboard Ranking Correctness
   * 
   * For any set of player session data, the leaderboard should rank players 
   * correctly based on points, with tiebreakers applied consistently 
   * (NFTs minted, average answer time).
   * 
   * Validates: Requirements 9.5
   */
  it('Property 9: Leaderboard Ranking Correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random player session data
        fc.array(
          fc.record({
            stakeKey: fc.string({ minLength: 59, maxLength: 59 }).map(
              (s) => `stake1u${s.substring(7)}`
            ),
            points: fc.integer({ min: 0, max: 1000 }),
            perfectScores: fc.integer({ min: 0, max: 10 }),
            avgAnswerTime: fc.integer({ min: 1000, max: 10000 }),
            nftsMinted: fc.integer({ min: 0, max: 5 }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (playerData) => {
          // Create players and update their leaderboard data
          const leaderboardService = new LeaderboardService();
          const playerStakeKeys: string[] = [];

          for (const data of playerData) {
            // Create player
            const playerResult = await query(
              `INSERT INTO players (stake_key, last_seen_at)
               VALUES ($1, NOW())
               RETURNING id`,
              [data.stakeKey]
            );
            const playerId = playerResult.rows[0].id;
            createdPlayerIds.push(playerId);
            createdStakeKeys.push(data.stakeKey);
            playerStakeKeys.push(data.stakeKey);

            // Update leaderboard
            await leaderboardService.updatePlayerPoints(
              data.stakeKey,
              testSeasonId,
              data.points,
              {
                perfectScores: data.perfectScores,
                avgAnswerTime: data.avgAnswerTime,
                sessionsUsed: 1,
                nftsMinted: data.nftsMinted,
                firstAchievedAt: new Date(),
              }
            );
          }

          // Get leaderboard
          const leaderboard = await leaderboardService.getGlobalLeaderboard(
            testSeasonId,
            100,
            0
          );

          // Verify rankings are correct
          const entries = leaderboard.entries;

          // 1. Verify entries are sorted by points (descending)
          for (let i = 0; i < entries.length - 1; i++) {
            const current = entries[i];
            const next = entries[i + 1];

            // Points should be in descending order
            if (current.points !== next.points) {
              expect(current.points).toBeGreaterThan(next.points);
            } else {
              // If points are equal, check tiebreakers
              // Tiebreaker 1: NFTs minted (more is better)
              if (current.nftsMinted !== next.nftsMinted) {
                expect(current.nftsMinted).toBeGreaterThanOrEqual(next.nftsMinted);
              } else {
                // Tiebreaker 2: Average answer time (lower is better)
                if (current.avgAnswerTime && next.avgAnswerTime) {
                  expect(current.avgAnswerTime).toBeLessThanOrEqual(next.avgAnswerTime);
                }
              }
            }
          }

          // 2. Verify rank numbers are sequential
          for (let i = 0; i < entries.length; i++) {
            expect(entries[i].rank).toBe(i + 1);
          }

          // 3. Verify all created players appear in leaderboard
          const leaderboardStakeKeys = entries.map((e) => e.stakeKey);
          for (const stakeKey of playerStakeKeys) {
            expect(leaderboardStakeKeys).toContain(stakeKey);
          }

          // 4. Verify points match what was set
          for (const entry of entries) {
            const originalData = playerData.find((d) => d.stakeKey === entry.stakeKey);
            if (originalData) {
              expect(entry.points).toBe(originalData.points);
            }
          }
        }
      ),
      { numRuns: 10 } // Run 10 times with different player data
    );
  });

  /**
   * Additional property: Leaderboard consistency across queries
   * 
   * For any leaderboard state, querying the same leaderboard multiple times
   * should return consistent results.
   */
  it('Property: Leaderboard query consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        async (limit, offset) => {
          const leaderboardService = new LeaderboardService();

          // Query leaderboard twice with same parameters
          const result1 = await leaderboardService.getGlobalLeaderboard(
            testSeasonId,
            limit,
            offset
          );

          const result2 = await leaderboardService.getGlobalLeaderboard(
            testSeasonId,
            limit,
            offset
          );

          // Results should be identical
          expect(result1.entries.length).toBe(result2.entries.length);
          expect(result1.total).toBe(result2.total);
          expect(result1.hasMore).toBe(result2.hasMore);

          // Verify each entry matches
          for (let i = 0; i < result1.entries.length; i++) {
            expect(result1.entries[i].rank).toBe(result2.entries[i].rank);
            expect(result1.entries[i].stakeKey).toBe(result2.entries[i].stakeKey);
            expect(result1.entries[i].points).toBe(result2.entries[i].points);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional property: Pagination correctness
   * 
   * For any leaderboard, paginating through all results should return
   * all entries exactly once.
   */
  it('Property: Leaderboard pagination correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        async (pageSize) => {
          const leaderboardService = new LeaderboardService();

          // Get total count
          const firstPage = await leaderboardService.getGlobalLeaderboard(
            testSeasonId,
            pageSize,
            0
          );

          const total = firstPage.total;
          const allEntries: any[] = [];

          // Paginate through all results
          let offset = 0;
          while (offset < total) {
            const page = await leaderboardService.getGlobalLeaderboard(
              testSeasonId,
              pageSize,
              offset
            );

            allEntries.push(...page.entries);
            offset += pageSize;
          }

          // Verify we got all entries
          expect(allEntries.length).toBe(total);

          // Verify no duplicates
          const stakeKeys = allEntries.map((e) => e.stakeKey);
          const uniqueStakeKeys = new Set(stakeKeys);
          expect(uniqueStakeKeys.size).toBe(stakeKeys.length);

          // Verify entries are still in correct order
          for (let i = 0; i < allEntries.length - 1; i++) {
            expect(allEntries[i].points).toBeGreaterThanOrEqual(allEntries[i + 1].points);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
