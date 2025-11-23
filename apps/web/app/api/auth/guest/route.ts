/**
 * POST /api/auth/guest
 * 
 * Guest user creation endpoint - creates a guest player with anonymous ID,
 * generates JWT token, and returns player info.
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGuestUser } from '../../../../../services/api/src/services/auth-service';
import { handleApiError, createCorsPreflightResponse } from '../../lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Create guest user and generate token
    const response = await createGuestUser();

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
      endpoint: '/api/auth/guest',
      method: 'POST',
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
