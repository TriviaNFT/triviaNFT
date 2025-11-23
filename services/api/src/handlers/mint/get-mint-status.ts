/**
 * GET /mint/{mintId}/status
 * Check status of a mint operation
 * Requirements: 14
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { MintService } from '../../services/mint-service';
import { verifyToken } from '../../utils/jwt';
import { NotFoundError, MintStatus } from '@trivia-nft/shared';
import type { GetMintStatusResponse } from '@trivia-nft/shared';

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

    // Get mint ID from path
    const mintId = event.pathParameters?.mintId;
    if (!mintId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing mintId parameter' }),
      };
    }

    const db = await getPool();
    const mintService = new MintService(db);

    // Get mint operation
    const mintOperation = await mintService.getMintOperation(mintId);

    if (!mintOperation) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Mint operation not found' }),
      };
    }

    // Verify ownership (get player ID from eligibility)
    const eligibility = await mintService.getEligibility(mintOperation.eligibilityId);
    if (!eligibility || eligibility.playerId !== playerId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Mint operation does not belong to this player' }),
      };
    }

    // If confirmed, get NFT details by mint operation ID (for idempotency)
    let nft = undefined;
    if (mintOperation.status === MintStatus.CONFIRMED) {
      nft = await mintService.getNFTByMintOperation(mintId);
    }

    const response: GetMintStatusResponse = {
      mintOperation,
      nft,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error getting mint status:', error);

    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }

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
