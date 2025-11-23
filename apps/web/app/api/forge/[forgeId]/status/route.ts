/**
 * GET /api/forge/{forgeId}/status
 * 
 * Get forge operation status
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../../../../services/api/src/db/connection';
import { ForgeService } from '../../../../../../../services/api/src/services/forge-service';
import { verifyToken } from '../../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError, NotFoundError } from '@trivia-nft/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { forgeId: string } }
) {
  try {
    // Verify JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization token');
    }

    const token = authHeader.replace('Bearer ', '');
    await verifyToken(token);

    // Get forge ID from path
    const forgeId = params.forgeId;

    // Get forge operation from database
    const db = await getPool();
    const forgeService = new ForgeService(db);
    const forgeOperation = await forgeService.getForgeOperation(forgeId);

    if (!forgeOperation) {
      throw new NotFoundError('Forge operation not found');
    }

    // Get Ultimate NFT if confirmed
    let ultimateNFT = null;
    if (forgeOperation.status === 'confirmed' && forgeOperation.outputAssetFingerprint) {
      const nftsQuery = `
        SELECT 
          id,
          stake_key as "stakeKey",
          policy_id as "policyId",
          asset_fingerprint as "assetFingerprint",
          token_name as "tokenName",
          source,
          category_id as "categoryId",
          season_id as "seasonId",
          tier,
          status,
          minted_at as "mintedAt",
          metadata,
          created_at as "createdAt"
        FROM player_nfts
        WHERE asset_fingerprint = $1
      `;

      const nftsResult = await db.query(nftsQuery, [forgeOperation.outputAssetFingerprint]);
      if (nftsResult.rows.length > 0) {
        const row = nftsResult.rows[0];
        ultimateNFT = {
          ...row,
          mintedAt: row.mintedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json(
      {
        forgeOperation,
        ultimateNFT,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Get forge status error:', error);

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

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 404,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
