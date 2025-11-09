/**
 * GET /leaderboard/season/{id}
 * 
 * Get season standings (historical or current)
 * Returns final standings with prizes awarded for completed seasons
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LeaderboardService } from '../../services/leaderboard-service.js';
import { query } from '../../db/connection.js';

const leaderboardService = new LeaderboardService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get path parameter
    const seasonId = event.pathParameters?.id;

    if (!seasonId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Season ID is required' }),
      };
    }

    // Verify season exists
    const seasonResult = await query(
      `SELECT id, name, starts_at, ends_at, grace_days,
              NOW() BETWEEN starts_at AND ends_at as is_active,
              NOW() > ends_at as is_completed
       FROM seasons 
       WHERE id = $1`,
      [seasonId]
    );

    if (seasonResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Season not found' }),
      };
    }

    const season = seasonResult.rows[0];

    // Get query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '20');
    const offset = parseInt(event.queryStringParameters?.offset || '0');

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Limit must be between 1 and 100' }),
      };
    }

    if (offset < 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Offset must be non-negative' }),
      };
    }

    // Get season standings
    const leaderboard = await leaderboardService.getSeasonStandings(
      seasonId,
      limit,
      offset
    );

    // Get prize information if season is completed
    let prizeInfo = null;
    if (season.is_completed) {
      // Get the winner (rank 1)
      const winnerResult = await query(
        `SELECT ls.stake_key, p.username, ls.points
         FROM leaderboard_snapshots ls
         JOIN players p ON ls.stake_key = p.stake_key
         WHERE ls.season_id = $1 AND ls.rank = 1
         AND ls.snapshot_date = (
           SELECT MAX(snapshot_date) 
           FROM leaderboard_snapshots 
           WHERE season_id = $1
         )`,
        [seasonId]
      );

      if (winnerResult.rows.length > 0) {
        const winner = winnerResult.rows[0];
        prizeInfo = {
          winner: {
            stakeKey: winner.stake_key,
            username: winner.username,
            points: winner.points,
          },
          prizeAwarded: true,
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        season: {
          id: season.id,
          name: season.name,
          startsAt: season.starts_at,
          endsAt: season.ends_at,
          graceDays: season.grace_days,
          isActive: season.is_active,
          isCompleted: season.is_completed,
        },
        ...leaderboard,
        prize: prizeInfo,
      }),
    };
  } catch (error) {
    console.error('Error getting season standings:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to get season standings',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
