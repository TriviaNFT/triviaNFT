/**
 * GET /sessions/history
 * 
 * Get session history for the authenticated player
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionService } from '../../services/session-service.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get player info from JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const playerId = claims.sub;

    // Parse query parameters
    const limit = event.queryStringParameters?.limit 
      ? parseInt(event.queryStringParameters.limit) 
      : 20;
    const offset = event.queryStringParameters?.offset 
      ? parseInt(event.queryStringParameters.offset) 
      : 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Limit must be between 1 and 100',
          code: 'INVALID_LIMIT',
        }),
      };
    }

    if (offset < 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Offset must be non-negative',
          code: 'INVALID_OFFSET',
        }),
      };
    }

    // Get session history
    const sessionService = new SessionService();
    const result = await sessionService.getSessionHistory(playerId, limit, offset);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error getting session history:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
