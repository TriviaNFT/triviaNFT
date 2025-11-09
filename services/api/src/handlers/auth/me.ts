/**
 * GET /auth/me
 * 
 * Current user endpoint - validates JWT token, fetches player info,
 * and returns player profile with stats.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getCurrentUser } from '../../services/auth-service.js';
import { verifyToken, extractTokenFromHeader } from '../../utils/jwt.js';
import { isAppError } from '@trivia-nft/shared';

/**
 * Lambda handler for getting current user
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Get current user request:', {
    requestId: event.requestContext.requestId,
    sourceIp: event.requestContext.identity.sourceIp,
  });

  try {
    // Verify JWT token
    const token = extractTokenFromHeader(event.headers.Authorization || event.headers.authorization);
    const payload = await verifyToken(token);

    // Get current user info
    const response = await getCurrentUser(
      payload.sub,
      payload.stakeKey
    );

    console.log('Current user retrieved successfully:', {
      playerId: response.player.id,
      username: response.player.username,
      remainingPlays: response.remainingPlays,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Get current user error:', error);

    // Handle application errors
    if (isAppError(error)) {
      return {
        statusCode: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(error.toJSON()),
      };
    }

    // Handle unknown errors
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
    };
  }
}
