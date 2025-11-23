/**
 * POST /api/mint/{eligibilityId}
 * 
 * Initiate NFT minting workflow using Inngest
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '../../../../src/lib/inngest';
import { getPool } from '../../../../../../services/api/src/db/connection';
import { MintService } from '../../../../../../services/api/src/services/mint-service';
import { verifyToken } from '../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError, ForbiddenError, ValidationError, InternalServerError } from '@trivia-nft/shared';
import type { InitiateMintResponse } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../lib/error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: { eligibilityId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.sub || !decoded.stakeKey) {
      throw new UnauthorizedError('Invalid token or missing stake key');
    }

    const playerId = decoded.sub;
    const stakeKey = decoded.stakeKey;
    const eligibilityId = params.eligibilityId;

    const db = await getPool();
    const mintService = new MintService(db);

    // Validate eligibility
    const eligibility = await mintService.validateEligibility(eligibilityId);

    // Verify ownership
    if (eligibility.playerId !== playerId) {
      throw new ForbiddenError('Eligibility does not belong to this player');
    }

    // Check if player has connected wallet
    if (!eligibility.stakeKey) {
      throw new ValidationError('Wallet not connected. Please connect your wallet to mint NFTs.');
    }

    // Check NFT stock availability
    if (!eligibility.categoryId) {
      throw new ValidationError('Invalid eligibility: missing category');
    }

    const stockAvailable = await mintService.checkStockAvailability(
      eligibility.categoryId
    );

    if (!stockAvailable) {
      throw new ValidationError(
        'No NFTs are available for this category right now. Please try again later or play a different category.'
      );
    }

    // Get policy ID from environment
    const policyId = process.env.NFT_POLICY_ID;
    if (!policyId) {
      throw new InternalServerError('NFT_POLICY_ID not configured');
    }

    // Create mint operation record
    const mintOperation = await mintService.createMintOperation(
      eligibilityId,
      '', // catalogId will be set by Inngest workflow
      playerId,
      stakeKey,
      policyId
    );

    // Trigger Inngest workflow instead of Step Functions
    await inngest.send({
      name: 'mint/initiated',
      data: {
        mintId: mintOperation.id,
        eligibilityId,
        playerId,
        stakeKey,
        categoryId: eligibility.categoryId,
        policyId,
      },
    });

    const response: InitiateMintResponse = {
      mintOperation,
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
      endpoint: '/api/mint/[eligibilityId]',
      method: 'POST',
      eligibilityId: params.eligibilityId,
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
