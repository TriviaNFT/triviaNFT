/**
 * GET /seasons/current
 * Returns current season details with countdown and active categories
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { SeasonService } from '../../services/season-service';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const db = await getPool();
    const seasonService = new SeasonService(db);

    // Get current active season
    const season = await seasonService.getCurrentSeason();

    if (!season) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'No active season found',
        }),
      };
    }

    // Calculate countdown to season end
    const now = new Date();
    const endsAt = new Date(season.endsAt);
    const msUntilEnd = endsAt.getTime() - now.getTime();
    const daysUntilEnd = Math.max(0, Math.floor(msUntilEnd / (1000 * 60 * 60 * 24)));
    const hoursUntilEnd = Math.max(0, Math.floor((msUntilEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const minutesUntilEnd = Math.max(0, Math.floor((msUntilEnd % (1000 * 60 * 60)) / (1000 * 60)));

    // Check if within grace period
    const isWithinGracePeriod = seasonService.isWithinGracePeriod(season);
    const graceEndDate = new Date(season.endsAt);
    graceEndDate.setDate(graceEndDate.getDate() + season.graceDays);

    // Get active categories for seasonal forging
    const activeCategories = await seasonService.getActiveSeasonalCategories();

    // Get category details
    const categoriesResult = await db.query(
      `SELECT id, name, slug, description, icon_url as "iconUrl"
       FROM categories
       WHERE id = ANY($1) AND is_active = true
       ORDER BY display_order`,
      [activeCategories]
    );

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
          startsAt: season.startsAt.toISOString(),
          endsAt: season.endsAt.toISOString(),
          graceDays: season.graceDays,
          isActive: season.isActive,
          isWithinGracePeriod,
          graceEndsAt: graceEndDate.toISOString(),
          countdown: {
            days: daysUntilEnd,
            hours: hoursUntilEnd,
            minutes: minutesUntilEnd,
            totalMs: Math.max(0, msUntilEnd),
          },
        },
        activeCategories: categoriesResult.rows,
      }),
    };
  } catch (error) {
    console.error('Error fetching current season:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};
