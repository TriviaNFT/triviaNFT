/**
 * GET /api/leaderboard/season/{seasonId}
 * 
 * Get season standings (historical or current)
 * Returns final standings with prizes awarded for completed seasons
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '../../../../../../../services/api/src/services/leaderboard-service';
import { query } from '../../../../../../../services/api/src/db/connection';

const leaderboardService = new LeaderboardService();

export async function GET(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    // Get path parameter
    const seasonId = params.seasonId;

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
      return NextResponse.json(
        { error: 'Season not found' },
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const season = seasonResult.rows[0];

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
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

    return NextResponse.json(
      {
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
    console.error('Error getting season standings:', error);

    return NextResponse.json(
      {
        error: 'Failed to get season standings',
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
