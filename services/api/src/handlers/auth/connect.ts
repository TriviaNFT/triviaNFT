/**
 * POST /auth/connect
 * 
 * Wallet connection endpoint - validates stake key, checks if player exists,
 * generates JWT token, and returns player info.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { connectWallet } from '../../services/auth-service.js';
import { connectWalletRequestSchema, ValidationError, isAppError } from '@trivia-nft/shared';

/**
 * Lambda handler for wallet connection
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Connect wallet request:', {
    requestId: event.requestContext.requestId,
    sourceIp: event.requestContext.identity.sourceIp,
  });

  try {
    // Parse and validate request body
    if (!event.body) {
      throw new ValidationError('Request body is required');
    }

    const body = JSON.parse(event.body);
    const validatedBody = connectWalletRequestSchema.parse(body);

    // Connect wallet and generate token
    const response = await connectWallet(
      validatedBody.stakeKey,
      validatedBody.paymentAddress
    );

    console.log('Wallet connected successfully:', {
      playerId: response.player.id,
      isNewUser: response.isNewUser,
      hasUsername: !!response.player.username,
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
    console.error('Connect wallet error:', error);

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
