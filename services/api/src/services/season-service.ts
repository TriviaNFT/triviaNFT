/**
 * Season Service
 * Manages seasons, season transitions, and season points
 */

import { Pool } from 'pg';

export interface Season {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  graceDays: number;
  isActive: boolean;
  createdAt: Date;
}

export interface SeasonPoints {
  seasonId: string;
  stakeKey: string;
  points: number;
  perfectScores: number;
  nftsMinted: number;
  avgAnswerMs: number;
  sessionsUsed: number;
  firstAchievedAt: Date | null;
  updatedAt: Date;
}

export interface CreateSeasonParams {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  graceDays?: number;
}

export class SeasonService {
  constructor(
    private db: Pool
  ) {}

  /**
   * Get the current active season
   */
  async getCurrentSeason(): Promise<Season | null> {
    const result = await this.db.query<Season>(
      `SELECT id, name, starts_at as "startsAt", ends_at as "endsAt", 
              grace_days as "graceDays", is_active as "isActive", created_at as "createdAt"
       FROM seasons
       WHERE is_active = true
       LIMIT 1`
    );

    return result.rows[0] || null;
  }

  /**
   * Get season by ID
   */
  async getSeasonById(seasonId: string): Promise<Season | null> {
    const result = await this.db.query<Season>(
      `SELECT id, name, starts_at as "startsAt", ends_at as "endsAt", 
              grace_days as "graceDays", is_active as "isActive", created_at as "createdAt"
       FROM seasons
       WHERE id = $1`,
      [seasonId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all seasons ordered by start date
   */
  async getAllSeasons(): Promise<Season[]> {
    const result = await this.db.query<Season>(
      `SELECT id, name, starts_at as "startsAt", ends_at as "endsAt", 
              grace_days as "graceDays", is_active as "isActive", created_at as "createdAt"
       FROM seasons
       ORDER BY starts_at DESC`
    );

    return result.rows;
  }

  /**
   * Create a new season
   */
  async createSeason(params: CreateSeasonParams): Promise<Season> {
    const { id, name, startsAt, endsAt, graceDays = 7 } = params;

    const result = await this.db.query<Season>(
      `INSERT INTO seasons (id, name, starts_at, ends_at, grace_days, is_active)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, name, starts_at as "startsAt", ends_at as "endsAt", 
                 grace_days as "graceDays", is_active as "isActive", created_at as "createdAt"`,
      [id, name, startsAt, endsAt, graceDays]
    );

    return result.rows[0];
  }

  /**
   * Activate a season (deactivates all others)
   */
  async activateSeason(seasonId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Deactivate all seasons
      await client.query('UPDATE seasons SET is_active = false');

      // Activate the specified season
      await client.query(
        'UPDATE seasons SET is_active = true WHERE id = $1',
        [seasonId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Initialize season_points records for all active players
   * This should be called when a new season starts
   */
  async initializeSeasonPoints(seasonId: string): Promise<number> {
    const result = await this.db.query(
      `INSERT INTO season_points (season_id, stake_key, points, perfect_scores, nfts_minted, avg_answer_ms, sessions_used)
       SELECT $1, stake_key, 0, 0, 0, 0, 0
       FROM players
       WHERE stake_key IS NOT NULL
       ON CONFLICT (season_id, stake_key) DO NOTHING
       RETURNING stake_key`,
      [seasonId]
    );

    return result.rowCount || 0;
  }

  /**
   * Get season points for a player
   */
  async getPlayerSeasonPoints(seasonId: string, stakeKey: string): Promise<SeasonPoints | null> {
    const result = await this.db.query<SeasonPoints>(
      `SELECT season_id as "seasonId", stake_key as "stakeKey", points, 
              perfect_scores as "perfectScores", nfts_minted as "nftsMinted",
              avg_answer_ms as "avgAnswerMs", sessions_used as "sessionsUsed",
              first_achieved_at as "firstAchievedAt", updated_at as "updatedAt"
       FROM season_points
       WHERE season_id = $1 AND stake_key = $2`,
      [seasonId, stakeKey]
    );

    return result.rows[0] || null;
  }

  /**
   * Update season points for a player
   */
  async updateSeasonPoints(
    seasonId: string,
    stakeKey: string,
    updates: {
      pointsDelta?: number;
      perfectScoresDelta?: number;
      nftsMintedDelta?: number;
      avgAnswerMs?: number;
      sessionsUsedDelta?: number;
    }
  ): Promise<void> {
    const {
      pointsDelta = 0,
      perfectScoresDelta = 0,
      nftsMintedDelta = 0,
      avgAnswerMs,
      sessionsUsedDelta = 0,
    } = updates;

    // Build the update query dynamically
    const updateParts: string[] = [];
    const values: any[] = [seasonId, stakeKey];
    let paramIndex = 3;

    if (pointsDelta !== 0) {
      updateParts.push(`points = points + $${paramIndex++}`);
      values.push(pointsDelta);
    }

    if (perfectScoresDelta !== 0) {
      updateParts.push(`perfect_scores = perfect_scores + $${paramIndex++}`);
      values.push(perfectScoresDelta);
    }

    if (nftsMintedDelta !== 0) {
      updateParts.push(`nfts_minted = nfts_minted + $${paramIndex++}`);
      values.push(nftsMintedDelta);
    }

    if (avgAnswerMs !== undefined) {
      updateParts.push(`avg_answer_ms = $${paramIndex++}`);
      values.push(avgAnswerMs);
    }

    if (sessionsUsedDelta !== 0) {
      updateParts.push(`sessions_used = sessions_used + $${paramIndex++}`);
      values.push(sessionsUsedDelta);
    }

    if (updateParts.length === 0) {
      return; // Nothing to update
    }

    // Set first_achieved_at if this is the first points
    updateParts.push(`first_achieved_at = COALESCE(first_achieved_at, NOW())`);

    const query = `
      INSERT INTO season_points (season_id, stake_key, points, perfect_scores, nfts_minted, avg_answer_ms, sessions_used, first_achieved_at)
      VALUES ($1, $2, ${pointsDelta}, ${perfectScoresDelta}, ${nftsMintedDelta}, ${avgAnswerMs || 0}, ${sessionsUsedDelta}, NOW())
      ON CONFLICT (season_id, stake_key) DO UPDATE SET
        ${updateParts.join(', ')}
    `;

    await this.db.query(query, values);
  }

  /**
   * Get top players for a season
   */
  async getSeasonLeaderboard(
    seasonId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<SeasonPoints & { rank: number; username: string }>> {
    const result = await this.db.query(
      `SELECT 
        ROW_NUMBER() OVER (
          ORDER BY sp.points DESC, sp.nfts_minted DESC, sp.perfect_scores DESC, 
                   sp.avg_answer_ms ASC, sp.sessions_used ASC, sp.first_achieved_at ASC
        ) as rank,
        sp.season_id as "seasonId",
        sp.stake_key as "stakeKey",
        sp.points,
        sp.perfect_scores as "perfectScores",
        sp.nfts_minted as "nftsMinted",
        sp.avg_answer_ms as "avgAnswerMs",
        sp.sessions_used as "sessionsUsed",
        sp.first_achieved_at as "firstAchievedAt",
        sp.updated_at as "updatedAt",
        p.username
       FROM season_points sp
       JOIN players p ON p.stake_key = sp.stake_key
       WHERE sp.season_id = $1 AND p.username IS NOT NULL
       ORDER BY rank
       LIMIT $2 OFFSET $3`,
      [seasonId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get player's rank in a season
   */
  async getPlayerRank(seasonId: string, stakeKey: string): Promise<number | null> {
    const result = await this.db.query<{ rank: number }>(
      `WITH ranked_players AS (
        SELECT 
          stake_key,
          ROW_NUMBER() OVER (
            ORDER BY points DESC, nfts_minted DESC, perfect_scores DESC, 
                     avg_answer_ms ASC, sessions_used ASC, first_achieved_at ASC
          ) as rank
        FROM season_points
        WHERE season_id = $1
      )
      SELECT rank FROM ranked_players WHERE stake_key = $2`,
      [seasonId, stakeKey]
    );

    return result.rows[0]?.rank || null;
  }

  /**
   * Check if a season is within grace period
   */
  isWithinGracePeriod(season: Season): boolean {
    const now = new Date();
    const graceEndDate = new Date(season.endsAt);
    graceEndDate.setDate(graceEndDate.getDate() + season.graceDays);
    
    return now >= season.endsAt && now <= graceEndDate;
  }

  /**
   * Get active categories for seasonal forging
   * Returns all categories for now, but could be filtered by season config
   */
  async getActiveSeasonalCategories(): Promise<string[]> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM categories WHERE is_active = true ORDER BY display_order`
    );

    return result.rows.map(row => row.id);
  }
}
