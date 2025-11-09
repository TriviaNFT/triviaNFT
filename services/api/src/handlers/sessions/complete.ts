/**
 * POST /sessions/{id}/complete
 * 
 * Complete an active session and calculate final results
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionService } from '../../services/session-service.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get session ID from path parameters
    const sessionId = event.pathParameters?.id;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Session ID is required' }),
      };
    }

    // Get player info from JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Complete session
    const sessionService = new SessionService();
    const result = await sessionService.completeSession(sessionId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error('Error completing session:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          }),
        };
      }
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
