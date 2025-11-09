/**
 * POST /auth/profile
 * 
 * Profile creation endpoint - validates username uniqueness, validates email format,
 * creates player record, and associates stake key with player.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createProfile } from '../../services/auth-service.js';
import { verifyToken, extractTokenFromHeader } from '../../utils/jwt.js';
import { createProfileRequestSchema, ValidationError, isAppError } from '@trivia-nft/shared';

/**
 * Lambda handler for profile creation
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Create profile request:', {
    requestId: event.requestContext.requestId,
    sourceIp: event.requestContext.identity.sourceIp,
  });

  try {
    // Verify JWT token
    const token = extractTokenFromHeader(event.headers.Authorization || event.headers.authorization);
    const payload = await verifyToken(token);

    // Parse and validate request body
    if (!event.body) {
      throw new ValidationError('Request body is required');
    }

    const body = JSON.parse(event.body);
    const validatedBody = createProfileRequestSchema.parse(body);

    // Create profile
    const response = await createProfile(
      payload.sub,
      validatedBody.username,
      validatedBody.email
    );

    console.log('Profile created successfully:', {
      playerId: response.player.id,
      username: response.player.username,
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
    console.error('Create profile error:', error);

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error,
        }),
      };
    }

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
