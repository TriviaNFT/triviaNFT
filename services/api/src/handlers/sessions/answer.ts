/**
 * POST /sessions/{id}/answer
 * 
 * Submit an answer for a question in an active session
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionService } from '../../services/session-service.js';
import { z } from 'zod';

const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(10000),
});

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

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const validation = submitAnswerSchema.safeParse(body);

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

    const { questionIndex, optionIndex, timeMs } = validation.data;

    // Get player info from JWT claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Submit answer
    const sessionService = new SessionService();
    const result = await sessionService.submitAnswer({
      sessionId,
      questionIndex,
      optionIndex,
      timeMs,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error submitting answer:', error);

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

      if (error.message === 'Invalid question index') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Invalid question index',
            code: 'INVALID_QUESTION_INDEX',
          }),
        };
      }

      if (error.message === 'Question index out of bounds') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Question index out of bounds',
            code: 'QUESTION_OUT_OF_BOUNDS',
          }),
        };
      }

      if (error.message === 'Answer submitted after timeout') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Answer submitted after timeout',
            code: 'ANSWER_TIMEOUT',
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
