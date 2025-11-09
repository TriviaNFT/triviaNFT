/**
 * GET /eligibilities
 * List active mint eligibilities for authenticated player
 * Requirements: 10, 11, 12
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { MintService } from '../../services/mint-service';
import { verifyToken } from '../../utils/jwt';
import type { GetEligibilitiesResponse } from '@trivia-nft/shared';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  try {
    // Verify authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing authorization header' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.sub) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const playerId = decoded.sub;

    // Get eligibilities
    const db = await getPool();
    const mintService = new MintService(db);

    const eligibilities = await mintService.getEligibilities(playerId);

    const response: GetEligibilitiesResponse = {
      eligibilities,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error getting eligibilities:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
