/**
 * POST /api/questions/flag
 * 
 * Allows players to report issues with questions
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '../../../../../../services/api/src/services/question-service';
import { verifyToken } from '../../../../../../services/api/src/utils/jwt';

interface FlagQuestionRequest {
  questionId: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  console.log('Question flagging request');

  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let payload;
    
    try {
      payload = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const playerId = payload.sub;

    // Parse request body
    const body: FlagQuestionRequest = await request.json();

    // Validate request
    if (!body.questionId) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.reason.length > 1000) {
      return NextResponse.json(
        { error: 'reason must be less than 1000 characters' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Flag the question
    const questionService = new QuestionService();
    
    try {
      await questionService.flagQuestion(body.questionId, playerId, body.reason.trim());
    } catch (error) {
      if (error instanceof Error && error.message === 'Question not found') {
        return NextResponse.json(
          { error: 'Question not found' },
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    console.log(`Question ${body.questionId} flagged by player ${playerId}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Question flagged for review. Thank you for helping improve the game!',
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error flagging question:', error);

    return NextResponse.json(
      {
        error: 'Failed to flag question',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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
