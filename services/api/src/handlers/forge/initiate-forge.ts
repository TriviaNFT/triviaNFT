/**
 * POST /forge/category, /forge/master, /forge/season
 * Initiate a forge operation
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { getPool } from '../../db/connection';
import { ForgeService } from '../../services/forge-service';
import { verifyToken } from '../../utils/jwt';
import { 
  UnauthorizedError, 
  ValidationError,
  validateRequestBody,
  validateContentLength,
  sanitizeObject,
  initiateForgeRequestSchema,
} from '@trivia-nft/shared';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Validate content length
    const contentLengthCheck = validateContentLength(event, 1024 * 50); // 50KB max
    if (!contentLengthCheck.success) {
      return contentLengthCheck.response;
    }

    // Verify JWT and extract stake key
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedError('Missing authorization token');
    }

    const payload = await verifyToken(token);
    const stakeKey = payload.stakeKey;

    if (!stakeKey) {
      throw new UnauthorizedError('Stake key required for forging');
    }

    // Validate and sanitize request body
    const bodyValidation = validateRequestBody(event, initiateForgeRequestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Sanitize all string inputs
    const sanitizedBody = sanitizeObject(bodyValidation.data);
    const { type, categoryId, seasonId, inputFingerprints } = sanitizedBody;

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

    // Validate forge requirements based on type
    switch (type) {
      case 'category':
        // Must have 10 NFTs from the same category
        if (nfts.length !== 10) {
          throw new ValidationError('Category forge requires exactly 10 NFTs');
        }
        const categories = new Set(nfts.map((nft) => nft.categoryId));
        if (categories.size !== 1 || !categories.has(categoryId)) {
          throw new ValidationError(
            'All NFTs must be from the same category'
          );
        }
        break;

      case 'master':
        // Must have 1 NFT from 10 different categories
        if (nfts.length !== 10) {
          throw new ValidationError('Master forge requires exactly 10 NFTs');
        }
        const masterCategories = new Set(nfts.map((nft) => nft.categoryId));
        if (masterCategories.size !== 10) {
          throw new ValidationError(
            'Master forge requires NFTs from 10 different categories'
          );
        }
        break;

      case 'season':
        // Must have 2 NFTs from each category in the season
        // Total should be 18 NFTs (2 * 9 categories)
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
        break;
    }

    // Create forge operation record
    const forgeOperation = await forgeService.createForgeOperation(
      type,
      stakeKey,
      inputFingerprints,
      categoryId,
      seasonId
    );

    // Start Step Function execution
    const stateMachineArn = process.env.FORGE_STATE_MACHINE_ARN;
    if (!stateMachineArn) {
      throw new Error('Forge state machine ARN not configured');
    }

    const executionInput = {
      forgeId: forgeOperation.id,
      type,
      stakeKey,
      categoryId,
      seasonId,
      inputFingerprints,
    };

    const command = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(executionInput),
      name: `forge-${forgeOperation.id}-${Date.now()}`,
    });

    await sfnClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ forgeOperation }),
    };
  } catch (error) {
    console.error('Initiate forge error:', error);

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

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
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
