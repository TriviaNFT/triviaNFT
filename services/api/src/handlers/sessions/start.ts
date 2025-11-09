/**
 * POST /sessions/start
 * 
 * Start a new trivia session
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionService } from '../../services/session-service.js';
import { z } from 'zod';

const startSessionSchema = z.object({
  categoryId: z.string().uuid(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const validation = startSessionSchema.safeParse(body);

    if (!validation.success) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Invalid request body',
          details: validation.error.errors,
        }),
      };
    }

    const { categoryId } = validation.data;

    // Get player info from JWT claims (set by authorizer)
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const playerId = claims.sub;
    const stakeKey = claims.stakeKey;
    const anonId = claims.anonId;

    // Verify category exists
    // TODO: Add category validation

    // Start session
    const sessionService = new SessionService();
    const session = await sessionService.startSession({
      playerId,
      stakeKey,
      anonId,
      categoryId,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    };
  } catch (error) {
    console.error('Error starting session:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Daily session limit reached') {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Daily session limit reached',
            code: 'DAILY_LIMIT_REACHED',
          }),
        };
      }

      if (error.message === 'Session cooldown active') {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Session cooldown active',
            code: 'COOLDOWN_ACTIVE',
          }),
        };
      }

      if (error.message === 'Active session already exists') {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Active session already exists',
            code: 'ACTIVE_SESSION_EXISTS',
          }),
        };
      }

      if (error.message === 'Not enough questions available for this category') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Not enough questions available for this category',
            code: 'INSUFFICIENT_QUESTIONS',
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
