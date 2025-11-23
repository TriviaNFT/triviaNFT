/**
 * POST /api/forge/season
 * 
 * Initiate a seasonal forge operation using Inngest
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '../../../../src/lib/inngest';
import { getPool } from '../../../../../../services/api/src/db/connection';
import { ForgeService } from '../../../../../../services/api/src/services/forge-service';
import { verifyToken } from '../../../../../../services/api/src/utils/jwt';
import { 
  UnauthorizedError, 
  ValidationError,
  sanitizeObject,
  initiateForgeRequestSchema,
} from '@trivia-nft/shared';

export async function POST(request: NextRequest) {
  try {
    // Validate content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 50) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { 
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Verify JWT and extract stake key
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization token');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);
    const stakeKey = payload.stakeKey;

    if (!stakeKey) {
      throw new UnauthorizedError('Stake key required for forging');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = initiateForgeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validation.error.errors,
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Sanitize all string inputs
    const sanitizedBody = sanitizeObject(validation.data);
    const { type, categoryId, seasonId, inputFingerprints } = sanitizedBody;

    // Validate type is 'season'
    if (type !== 'season') {
      throw new ValidationError('Invalid forge type for this endpoint');
    }

    // Initialize services
    const db = await getPool();
    const forgeService = new ForgeService(db);

    // Validate NFT ownership
    const ownsNFTs = await forgeService.validateNFTOwnership(
      stakeKey,
      inputFingerprints
    );

    if (!ownsNFTs) {
      throw new ValidationError('You do not own all specified NFTs');
    }

    // Get NFTs to validate forge requirements
    const nfts = await forgeService.getNFTsByFingerprints(inputFingerprints);

    // Validate seasonal forge requirements
    const seasonCategories = new Set(nfts.map((nft) => nft.categoryId));
    const nftsPerCategory: Record<string, number> = {};
    
    for (const nft of nfts) {
      if (nft.categoryId) {
        nftsPerCategory[nft.categoryId] = (nftsPerCategory[nft.categoryId] || 0) + 1;
      }
    }

    // Check that we have 2 NFTs from each category
    const hasValidCount = Object.values(nftsPerCategory).every((count) => count === 2);
    if (!hasValidCount || seasonCategories.size < 9) {
      throw new ValidationError(
        'Seasonal forge requires 2 NFTs from each active category'
      );
    }

    // Validate all NFTs are from the specified season
    const allFromSeason = nfts.every((nft) => nft.seasonId === seasonId);
    if (!allFromSeason) {
      throw new ValidationError('All NFTs must be from the specified season');
    }

    // Create forge operation record
    const forgeOperation = await forgeService.createForgeOperation(
      type,
      stakeKey,
      inputFingerprints,
      categoryId,
      seasonId
    );

    // Trigger Inngest workflow instead of Step Functions
    await inngest.send({
      name: 'forge/initiated',
      data: {
        forgeId: forgeOperation.id,
        type,
        stakeKey,
        categoryId,
        seasonId,
        inputFingerprints,
      },
    });

    return NextResponse.json(
      { forgeOperation },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Initiate forge error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
