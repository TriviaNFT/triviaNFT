/**
 * GET /api/questions/{categoryId}
 * 
 * Get questions for a category (used during session)
 * Note: This endpoint returns questions WITHOUT correct answers for security
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '../../../../../../services/api/src/services/question-service';
import { UpstashRedisService } from '../../../../../../services/api/src/services/upstash-redis-service';
import { verifyToken } from '../../../../../../services/api/src/utils/jwt';

interface QuestionResponse {
  id: string;
  text: string;
  options: string[];
  // Note: correctIndex and explanation are NOT included in response
}

export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
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
    const stakeKey = payload.stakeKey;
    const anonId = payload.anonId;

    // Get category ID from path
    const categoryId = params.categoryId;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '10');

    // Get configuration from environment (or use defaults)
    const reusedRatio = parseFloat(process.env.QUESTIONS_REUSED_RATIO || '0.5');
    const poolThreshold = parseInt(process.env.QUESTIONS_POOL_THRESHOLD || '1000');

    // Initialize services
    const questionService = new QuestionService();
    const redisService = new UpstashRedisService();

    // Get pool size
    const poolSize = await questionService.getQuestionPoolCount(categoryId);

    // Calculate reused vs new question counts
    let reusedCount = 0;
    let newCount = count;

    if (poolSize >= poolThreshold) {
      reusedCount = Math.floor(count * reusedRatio);
      newCount = count - reusedCount;
    }

    // Get seen question IDs from Redis (for today)
    const identifier = stakeKey || anonId || playerId;
    const today = new Date().toISOString().split('T')[0];
    const seenKey = `seen:${identifier}:${categoryId}:${today}`;
    
    const seenIds = await redisService.getSeenQuestions(seenKey);

    console.log(`Selecting questions for category ${categoryId}:`, {
      poolSize,
      reusedCount,
      newCount,
      seenCount: seenIds.length,
    });

    // Select questions
    const questions = await questionService.selectQuestionsForSession({
      categoryId,
      count,
      excludeIds: seenIds,
      reusedCount,
      newCount,
    });

    if (questions.length < count) {
      console.warn(`Only found ${questions.length} questions, requested ${count}`);
    }

    // Return questions WITHOUT correct answers to client
    // Note: Full questions (with correct answers) should be stored in Redis session state
    // for server-side validation during answer submission
    const clientQuestions: QuestionResponse[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
    }));

    return NextResponse.json(
      {
        questions: clientQuestions,
        poolSize,
        reusedCount,
        newCount,
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error selecting questions:', error);

    return NextResponse.json(
      {
        error: 'Failed to select questions',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
