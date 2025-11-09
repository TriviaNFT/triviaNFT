/**
 * POST /mint/{eligibilityId}
 * Initiate NFT minting workflow
 * Requirements: 10, 13, 14
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { getPool } from '../../db/connection';
import { MintService } from '../../services/mint-service';
import { verifyToken } from '../../utils/jwt';
import { ValidationError, NotFoundError } from '@trivia-nft/shared';
import type { InitiateMintResponse } from '@trivia-nft/shared';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

    if (!decoded || !decoded.sub || !decoded.stakeKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token or missing stake key' }),
      };
    }

    const playerId = decoded.sub;
    const stakeKey = decoded.stakeKey;

    // Get eligibility ID from path
    const eligibilityId = event.pathParameters?.eligibilityId;
    if (!eligibilityId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing eligibilityId parameter' }),
      };
    }

    const db = await getPool();
    const mintService = new MintService(db);

    // Validate eligibility
    const eligibility = await mintService.validateEligibility(eligibilityId);

    // Verify ownership
    if (eligibility.playerId !== playerId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Eligibility does not belong to this player' }),
      };
    }

    // Check if player has connected wallet
    if (!eligibility.stakeKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Wallet not connected. Please connect your wallet to mint NFTs.',
        }),
      };
    }

    // Check NFT stock availability
    if (!eligibility.categoryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid eligibility: missing category' }),
      };
    }

    const stockAvailable = await mintService.checkStockAvailability(
      eligibility.categoryId
    );

    if (!stockAvailable) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            'No NFTs are available for this category right now. Please try again later or play a different category.',
        }),
      };
    }

    // Get policy ID from environment
    const policyId = process.env.NFT_POLICY_ID;
    if (!policyId) {
      throw new Error('NFT_POLICY_ID not configured');
    }

    // Create mint operation record
    const mintOperation = await mintService.createMintOperation(
      eligibilityId,
      '', // catalogId will be set by Step Function
      playerId,
      stakeKey,
      policyId
    );

    // Start Step Function execution
    const stateMachineArn = process.env.MINT_STATE_MACHINE_ARN;
    if (!stateMachineArn) {
      throw new Error('MINT_STATE_MACHINE_ARN not configured');
    }

    const executionInput = {
      mintId: mintOperation.id,
      eligibilityId,
      playerId,
      stakeKey,
      categoryId: eligibility.categoryId,
      policyId,
    };

    const command = new StartExecutionCommand({
      stateMachineArn,
      name: `mint-${mintOperation.id}-${Date.now()}`,
      input: JSON.stringify(executionInput),
    });

    const execution = await sfnClient.send(command);

    console.log('Started mint workflow:', {
      mintId: mintOperation.id,
      executionArn: execution.executionArn,
    });

    const response: InitiateMintResponse = {
      mintOperation,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error initiating mint:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }

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
