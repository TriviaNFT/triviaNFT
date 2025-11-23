/**
 * GET /api/mint/{mintId}/status
 * 
 * Check status of a mint operation
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../../../../services/api/src/db/connection';
import { MintService } from '../../../../../../../services/api/src/services/mint-service';
import { verifyToken } from '../../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError, NotFoundError, ForbiddenError, MintStatus } from '@trivia-nft/shared';
import type { GetMintStatusResponse } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../../lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { mintId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError('Invalid token');
    }

    const playerId = decoded.sub;
    const mintId = params.mintId;

    const db = await getPool();
    const mintService = new MintService(db);

    // Get mint operation
    const mintOperation = await mintService.getMintOperation(mintId);

    if (!mintOperation) {
      throw new NotFoundError('Mint operation');
    }

    // Verify ownership (get player ID from eligibility)
    const eligibility = await mintService.getEligibility(mintOperation.eligibilityId);
    if (!eligibility || eligibility.playerId !== playerId) {
      throw new ForbiddenError('Mint operation does not belong to this player');
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

    return NextResponse.json(response, { 
      status: 200, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/mint/[mintId]/status',
      method: 'GET',
      mintId: params.mintId,
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['GET', 'OPTIONS']);
}
