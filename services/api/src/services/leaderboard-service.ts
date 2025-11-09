/**
 * Leaderboard Service
 * 
 * Handles leaderboard updates and queries with composite scoring and tie-breakers
 */

import { query } from '../db/connection.js';
import { RedisService } from './redis-service.js';

interface PointsMetadata {
  nftsMinted: number;
  perfectScores: number;
  avgAnswerTime: number;
  sessionsUsed: number;
  firstAchievedAt: Date;
}

interface LeaderboardEntry {
  rank: number;
  stakeKey: string;
  username: string;
  points: number;
  nftsMinted: number;
  perfectScores: number;
  avgAnswerTime: number;
  sessionsUsed: number;
  firstAchievedAt: string;
}

interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
}

export class LeaderboardService {
  private redis: RedisService;

  constructor() {
    this.redis = new RedisService();
  }

  /**
   * Update player points in both Redis and Aurora
   * Implements composite score calculation with tie-breakers
   */
  async updatePlayerPoints(
    stakeKey: string,
    seasonId: string,
    pointsToAdd: number,
    metadata: Partial<PointsMetadata>
  ): Promise<void> {
    // Get current season points for this player
    const seasonPointsResult = await query(
      `SELECT points, perfects, minted_count, avg_answer_ms, sessions_used, first_achieved_at
       FROM season_points
       WHERE season_id = $1 AND stake_key = $2`,
      [seasonId, stakeKey]
    );

    let currentPoints = 0;
    let perfects = 0;
    let mintedCount = 0;
    let avgAnswerMs = 0;
    let sessionsUsed = 0;
    let firstAchievedAt = new Date();

    if (seasonPointsResult.rows.length > 0) {
      const row = seasonPointsResult.rows[0];
      currentPoints = row.points || 0;
      perfects = row.perfects || 0;
      mintedCount = row.minted_count || 0;
      avgAnswerMs = row.avg_answer_ms || 0;
      sessionsUsed = row.sessions_used || 0;
      firstAchievedAt = new Date(row.first_achieved_at);
    }

    // Update values
    const newPoints = currentPoints + pointsToAdd;
    const newPerfects = perfects + (metadata.perfectScores || 0);
    const newMintedCount = mintedCount + (metadata.nftsMinted || 0);
    const newSessionsUsed = sessionsUsed + (metadata.sessionsUsed || 0);
    
    // Calculate new average answer time
    let newAvgAnswerMs = avgAnswerMs;
    if (metadata.avgAnswerTime !== undefined && metadata.sessionsUsed) {
      if (avgAnswerMs === 0) {
        newAvgAnswerMs = metadata.avgAnswerTime;
      } else {
        newAvgAnswerMs = (avgAnswerMs * sessionsUsed + metadata.avgAnswerTime) / newSessionsUsed;
      }
    }

    // Use provided firstAchievedAt or keep existing
    if (metadata.firstAchievedAt) {
      firstAchievedAt = metadata.firstAchievedAt;
    }

    // Upsert season points in Aurora
    await query(
      `INSERT INTO season_points (season_id, stake_key, points, perfects, minted_count, avg_answer_ms, sessions_used, first_achieved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (season_id, stake_key)
       DO UPDATE SET
         points = $3,
         perfects = $4,
         minted_count = $5,
         avg_answer_ms = $6,
         sessions_used = $7`,
      [seasonId, stakeKey, newPoints, newPerfects, newMintedCount, newAvgAnswerMs, newSessionsUsed, firstAchievedAt.toISOString()]
    );

    // Calculate composite score with tie-breakers
    // score = (points * 1e15) + (nfts * 1e12) + (perfects * 1e9) + 
    //         ((1e9 - avgTime) * 1e6) + ((1e6 - sessions) * 1e3) + timestamp
    const timestamp = firstAchievedAt.getTime();
    const compositeScore = 
      newPoints * 1e15 +
      newMintedCount * 1e12 +
      newPerfects * 1e9 +
      (1e9 - Math.min(newAvgAnswerMs, 1e9)) * 1e6 +
      (1e6 - Math.min(newSessionsUsed, 1e6)) * 1e3 +
      (timestamp % 1e3);

    // Update Redis sorted set (global ladder)
    const leaderboardKey = `ladder:global:${seasonId}`;
    const client = await (this.redis as any).getClient();
    await client.zAdd(leaderboardKey, { score: compositeScore, value: stakeKey });
  }



  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(
    seasonId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<LeaderboardPage> {
    const leaderboardKey = `ladder:global:${seasonId}`;
    const client = await (this.redis as any).getClient();

    // Get total count
    const total = await client.zCard(leaderboardKey);

    // Get entries with scores (ZREVRANGE returns highest to lowest)
    const entries = await client.zRangeWithScores(leaderboardKey, offset, offset + limit - 1, {
      REV: true,
    });

    // Get stake keys
    const stakeKeys = entries.map((entry: any) => entry.value);

    if (stakeKeys.length === 0) {
      return {
        entries: [],
        total,
        hasMore: offset + limit < total,
      };
    }

    // Fetch usernames and detailed data from Aurora
    const result = await query(
      `SELECT sp.stake_key, p.username, sp.points, sp.perfects, sp.minted_count, 
              sp.avg_answer_ms, sp.sessions_used, sp.first_achieved_at
       FROM season_points sp
       JOIN players p ON sp.stake_key = p.stake_key
       WHERE sp.season_id = $1 AND sp.stake_key = ANY($2)`,
      [seasonId, stakeKeys]
    );

    // Create a map for quick lookup
    const dataMap = new Map(
      result.rows.map((row: any) => [
        row.stake_key,
        {
          username: row.username,
          points: row.points,
          nftsMinted: row.minted_count,
          perfectScores: row.perfects,
          avgAnswerTime: row.avg_answer_ms,
          sessionsUsed: row.sessions_used,
          firstAchievedAt: row.first_achieved_at,
        },
      ])
    );

    // Build leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = entries.map((entry: any, index: number) => {
      const stakeKey = entry.value;
      const data = dataMap.get(stakeKey);

      return {
        rank: offset + index + 1,
        stakeKey,
        username: data?.username || 'Unknown',
        points: data?.points || 0,
        nftsMinted: data?.nftsMinted || 0,
        perfectScores: data?.perfectScores || 0,
        avgAnswerTime: data?.avgAnswerTime || 0,
        sessionsUsed: data?.sessionsUsed || 0,
        firstAchievedAt: data?.firstAchievedAt || new Date().toISOString(),
      };
    });

    return {
      entries: leaderboardEntries,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get category-specific leaderboard
   */
  async getCategoryLeaderboard(
    categoryId: string,
    seasonId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<LeaderboardPage> {
    const leaderboardKey = `ladder:category:${categoryId}:${seasonId}`;
    const client = await (this.redis as any).getClient();

    // Get total count
    const total = await client.zCard(leaderboardKey);

    // Get entries with scores
    const entries = await client.zRangeWithScores(leaderboardKey, offset, offset + limit - 1, {
      REV: true,
    });

    // Get stake keys
    const stakeKeys = entries.map((entry: any) => entry.value);

    if (stakeKeys.length === 0) {
      return {
        entries: [],
        total,
        hasMore: offset + limit < total,
      };
    }

    // Fetch usernames and detailed data from Aurora
    // For category leaderboards, we need to calculate points from sessions in that category
    const result = await query(
      `SELECT s.stake_key, p.username,
              COUNT(*) FILTER (WHERE s.score = 10) as perfects,
              SUM(s.score) as points,
              AVG(s.total_ms / 10.0) as avg_answer_ms,
              COUNT(*) as sessions_used,
              MIN(s.started_at) as first_achieved_at
       FROM sessions s
       JOIN players p ON s.stake_key = p.stake_key
       WHERE s.category_id = $1 AND s.stake_key = ANY($2)
       GROUP BY s.stake_key, p.username`,
      [categoryId, stakeKeys]
    );

    // Create a map for quick lookup
    const dataMap = new Map(
      result.rows.map((row: any) => [
        row.stake_key,
        {
          username: row.username,
          points: parseInt(row.points) || 0,
          nftsMinted: 0, // Not tracked per category
          perfectScores: parseInt(row.perfects) || 0,
          avgAnswerTime: parseFloat(row.avg_answer_ms) || 0,
          sessionsUsed: parseInt(row.sessions_used) || 0,
          firstAchievedAt: row.first_achieved_at,
        },
      ])
    );

    // Build leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = entries.map((entry: any, index: number) => {
      const stakeKey = entry.value;
      const data = dataMap.get(stakeKey);

      return {
        rank: offset + index + 1,
        stakeKey,
        username: data?.username || 'Unknown',
        points: data?.points || 0,
        nftsMinted: data?.nftsMinted || 0,
        perfectScores: data?.perfectScores || 0,
        avgAnswerTime: data?.avgAnswerTime || 0,
        sessionsUsed: data?.sessionsUsed || 0,
        firstAchievedAt: data?.firstAchievedAt || new Date().toISOString(),
      };
    });

    return {
      entries: leaderboardEntries,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get season standings (historical or current)
   */
  async getSeasonStandings(
    seasonId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<LeaderboardPage> {
    // Check if this is the current season
    const currentSeasonResult = await query(
      `SELECT id FROM seasons 
       WHERE id = $1 AND NOW() BETWEEN starts_at AND ends_at`,
      [seasonId]
    );

    const isCurrentSeason = currentSeasonResult.rows.length > 0;

    if (isCurrentSeason) {
      // For current season, use Redis leaderboard
      return this.getGlobalLeaderboard(seasonId, limit, offset);
    } else {
      // For historical seasons, query leaderboard_snapshots
      const countResult = await query(
        `SELECT COUNT(DISTINCT stake_key) as count
         FROM leaderboard_snapshots
         WHERE season_id = $1`,
        [seasonId]
      );
      const total = parseInt(countResult.rows[0]?.count || '0');

      // Get latest snapshot for this season
      const result = await query(
        `SELECT ls.stake_key, p.username, ls.points, ls.perfects, ls.minted_count,
                ls.avg_answer_ms, ls.sessions_used, ls.first_achieved_at, ls.rank
         FROM leaderboard_snapshots ls
         JOIN players p ON ls.stake_key = p.stake_key
         WHERE ls.season_id = $1
         AND ls.snapshot_date = (
           SELECT MAX(snapshot_date) 
           FROM leaderboard_snapshots 
           WHERE season_id = $1
         )
         ORDER BY ls.rank
         LIMIT $2 OFFSET $3`,
        [seasonId, limit, offset]
      );

      const entries: LeaderboardEntry[] = result.rows.map((row: any) => ({
        rank: row.rank,
        stakeKey: row.stake_key,
        username: row.username,
        points: row.points,
        nftsMinted: row.minted_count,
        perfectScores: row.perfects,
        avgAnswerTime: row.avg_answer_ms,
        sessionsUsed: row.sessions_used,
        firstAchievedAt: row.first_achieved_at,
      }));

      return {
        entries,
        total,
        hasMore: offset + limit < total,
      };
    }
  }

  /**
   * Update category leaderboard for a player
   */
  async updateCategoryLeaderboard(
    stakeKey: string,
    categoryId: string,
    seasonId: string
  ): Promise<void> {
    // Get current category stats from sessions
    const result = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE score = 10) as perfects,
         SUM(score) as total_points,
         AVG(total_ms / 10.0) as avg_answer_ms,
         COUNT(*) as sessions_used,
         MIN(started_at) as first_achieved_at
       FROM sessions
       WHERE stake_key = $1 AND category_id = $2`,
      [stakeKey, categoryId]
    );

    if (result.rows.length === 0) {
      return;
    }

    const row = result.rows[0];
    const points = parseInt(row.total_points) || 0;
    const perfects = parseInt(row.perfects) || 0;
    const avgAnswerMs = parseFloat(row.avg_answer_ms) || 0;
    const sessionsUsed = parseInt(row.sessions_used) || 0;
    const firstAchievedAt = new Date(row.first_achieved_at);

    // Calculate composite score
    const timestamp = firstAchievedAt.getTime();
    const compositeScore = 
      points * 1e15 +
      perfects * 1e9 +
      (1e9 - Math.min(avgAnswerMs, 1e9)) * 1e6 +
      (1e6 - Math.min(sessionsUsed, 1e6)) * 1e3 +
      (timestamp % 1e3);

    // Update Redis sorted set (category ladder)
    const leaderboardKey = `ladder:category:${categoryId}:${seasonId}`;
    const client = await (this.redis as any).getClient();
    await client.zAdd(leaderboardKey, { score: compositeScore, value: stakeKey });
  }
}
