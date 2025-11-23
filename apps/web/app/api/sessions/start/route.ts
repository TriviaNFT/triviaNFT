/**
 * POST /api/sessions/start
 * 
 * Start a new trivia session
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '../../../../../../services/api/src/services/session-service';
import { verifyToken } from '../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../lib/error-handler';
import { z } from 'zod';

const startSessionSchema = z.object({
  categoryId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { categoryId } = startSessionSchema.parse(body);

    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const claims = await verifyToken(token);

    const playerId = claims.sub;
    const stakeKey = claims.stakeKey;
    const anonId = claims.anonId;

    // Start session
    const sessionService = new SessionService();
    const session = await sessionService.startSession({
      playerId,
      stakeKey,
      anonId,
      categoryId,
    });

    return NextResponse.json(
      { session },
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/sessions/start',
      method: 'POST',
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
