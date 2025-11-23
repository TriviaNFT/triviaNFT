/**
 * POST /api/auth/connect
 * 
 * Wallet connection endpoint - validates stake key, checks if player exists,
 * generates JWT token, and returns player info.
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectWallet } from '../../../../../services/api/src/services/auth-service';
import { connectWalletRequestSchema } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedBody = connectWalletRequestSchema.parse(body);

    // Connect wallet and generate token
    const response = await connectWallet(
      validatedBody.stakeKey,
      validatedBody.paymentAddress
    );

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/auth/connect',
      method: 'POST',
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
