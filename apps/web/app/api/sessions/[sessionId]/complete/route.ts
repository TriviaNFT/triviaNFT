/**
 * POST /api/sessions/{sessionId}/complete
 * 
 * Complete an active session and calculate final results
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '../../../../../../../services/api/src/services/session-service';
import { verifyToken } from '../../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../../lib/error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    await verifyToken(token);

    // Complete session
    const sessionService = new SessionService();
    const result = await sessionService.completeSession(sessionId);

    return NextResponse.json(
      { result },
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
      endpoint: '/api/sessions/[sessionId]/complete',
      method: 'POST',
      sessionId: params.sessionId,
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
