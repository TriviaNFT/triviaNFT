/**
 * POST /api/sessions/{sessionId}/answer
 * 
 * Submit an answer for a question in an active session
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '../../../../../../../services/api/src/services/session-service';
import { verifyToken } from '../../../../../../../services/api/src/utils/jwt';
import { UnauthorizedError } from '@trivia-nft/shared';
import { handleApiError, createCorsPreflightResponse } from '../../../lib/error-handler';
import { z } from 'zod';

const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(10000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Parse request body
    const body = await request.json();
    const { questionIndex, optionIndex, timeMs } = submitAnswerSchema.parse(body);

    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    await verifyToken(token);

    // Submit answer
    const sessionService = new SessionService();
    const result = await sessionService.submitAnswer({
      sessionId,
      questionIndex,
      optionIndex,
      timeMs,
    });

    return NextResponse.json(
      result,
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
      endpoint: '/api/sessions/[sessionId]/answer',
      method: 'POST',
      sessionId: params.sessionId,
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createCorsPreflightResponse(['POST', 'OPTIONS']);
}
