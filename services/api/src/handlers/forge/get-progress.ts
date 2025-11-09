/**
 * GET /forge/progress
 * Get forging progress for the authenticated player
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { ForgeService } from '../../services/forge-service';
import { verifyToken } from '../../utils/jwt';
import { UnauthorizedError } from '@trivia-nft/shared';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify JWT and extract stake key
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedError('Missing authorization token');
    }

    const payload = await verifyToken(token);
    const stakeKey = payload.stakeKey;

    if (!stakeKey) {
      throw new UnauthorizedError('Stake key required for forging');
    }

    // Get forge progress
    const db = await getPool();
    const forgeService = new ForgeService(db);
    const progress = await forgeService.getForgeProgress(stakeKey);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ progress }),
    };
  } catch (error) {
    console.error('Get forge progress error:', error);

    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
