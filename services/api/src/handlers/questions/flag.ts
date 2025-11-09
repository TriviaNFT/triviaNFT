/**
 * Question Flagging Lambda Handler
 * 
 * POST /questions/flag
 * Allows players to report issues with questions
 * 
 * Requirements: 9
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QuestionService } from '../../services/question-service.js';
import { verifyToken } from '../../utils/jwt.js';

interface FlagQuestionRequest {
  questionId: string;
  reason: string;
}

/**
 * Lambda handler for question flagging
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Question flagging request:', {
    path: event.path,
    method: event.httpMethod,
  });

  try {
    // Verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authorization header is required' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    let payload;
    
    try {
      payload = await verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    const playerId = payload.sub;

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body: FlagQuestionRequest = JSON.parse(event.body);

    // Validate request
    if (!body.questionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'questionId is required' }),
      };
    }

    if (!body.reason || body.reason.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'reason is required' }),
      };
    }

    if (body.reason.length > 1000) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'reason must be less than 1000 characters' }),
      };
    }

    // Flag the question
    const questionService = new QuestionService();
    
    try {
      await questionService.flagQuestion(body.questionId, playerId, body.reason.trim());
    } catch (error) {
      if (error instanceof Error && error.message === 'Question not found') {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Question not found' }),
        };
      }
      throw error;
    }

    console.log(`Question ${body.questionId} flagged by player ${playerId}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Question flagged for review. Thank you for helping improve the game!',
      }),
    };
  } catch (error) {
    console.error('Error flagging question:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to flag question',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
