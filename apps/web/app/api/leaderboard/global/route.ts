/**
 * GET /api/leaderboard/global
 * 
 * Get global leaderboard for current or specified season
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '../../../../../../services/api/src/services/leaderboard-service';
import { query } from '../../../../../../services/api/src/db/connection';

const leaderboardService = new LeaderboardService();

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const seasonId = searchParams.get('seasonId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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

    return NextResponse.json(
      {
        seasonId: currentSeasonId,
        ...leaderboard,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error getting global leaderboard:', error);

    return NextResponse.json(
      {
        error: 'Failed to get global leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
