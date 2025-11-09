/**
 * GET /forge/{forgeId}/status
 * Get forge operation status
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { getPool } from '../../db/connection';
import { ForgeService } from '../../services/forge-service';
import { verifyToken } from '../../utils/jwt';
import { UnauthorizedError, NotFoundError } from '@trivia-nft/shared';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify JWT
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedError('Missing authorization token');
    }

    await verifyToken(token);

    // Get forge ID from path
    const forgeId = event.pathParameters?.forgeId;
    if (!forgeId) {
      throw new NotFoundError('Forge ID required');
    }

    // Get forge operation from database
    const db = await getPool();
    const forgeService = new ForgeService(db);
    const forgeOperation = await forgeService.getForgeOperation(forgeId);

    if (!forgeOperation) {
      throw new NotFoundError('Forge operation not found');
    }

    // Try to get Step Function execution status
    let executionStatus = null;
    try {
      const stateMachineArn = process.env.FORGE_STATE_MACHINE_ARN;
      if (stateMachineArn) {
        // Construct execution ARN
        const executionArn = stateMachineArn.replace(
          ':stateMachine:',
          ':execution:'
        ) + `:forge-${forgeId}`;

        const command = new DescribeExecutionCommand({
          executionArn,
        });

        const response = await sfnClient.send(command);
        executionStatus = {
          status: response.status,
          startDate: response.startDate,
          stopDate: response.stopDate,
        };
      }
    } catch (error) {
      // Execution not found or error - continue with database status
      console.log('Could not fetch execution status:', error);
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        forgeOperation,
        executionStatus,
        ultimateNFT,
      }),
    };
  } catch (error) {
    console.error('Get forge status error:', error);

    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
