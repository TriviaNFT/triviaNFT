/**
 * GET /leaderboard/global
 * 
 * Get global leaderboard for current or specified season
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LeaderboardService } from '../../services/leaderboard-service.js';
import { query } from '../../db/connection.js';

const leaderboardService = new LeaderboardService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get query parameters
    const seasonId = event.queryStringParameters?.seasonId;
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

    // Get current season if not specified
    let currentSeasonId: string;
    if (seasonId) {
      currentSeasonId = seasonId;
    } else {
      const seasonResult = await query(
        `SELECT id FROM seasons 
         WHERE NOW() BETWEEN starts_at AND ends_at
         ORDER BY starts_at DESC
         LIMIT 1`
      );

      if (seasonResult.rows.length === 0) {
        // No active season, use default
        currentSeasonId = 'winter-s1';
      } else {
        currentSeasonId = seasonResult.rows[0].id;
      }
    }

    // Get leaderboard
    const leaderboard = await leaderboardService.getGlobalLeaderboard(
      currentSeasonId,
      limit,
      offset
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        seasonId: currentSeasonId,
        ...leaderboard,
      }),
    };
  } catch (error) {
    console.error('Error getting global leaderboard:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to get global leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
