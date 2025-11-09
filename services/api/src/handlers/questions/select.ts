/**
 * Question Selection Lambda Handler
 * 
 * POST /questions/select
 * Selects questions for a session based on pool size and seen questions
 * 
 * Requirements: 7, 8, 36
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QuestionService } from '../../services/question-service.js';
import { RedisService } from '../../services/redis-service.js';

interface SelectQuestionsRequest {
  categoryId: string;
  playerId: string;
  stakeKey?: string;
  count?: number;
}

interface QuestionResponse {
  id: string;
  text: string;
  options: string[];
  // Note: correctIndex and explanation are NOT included in response
}

/**
 * Lambda handler for question selection
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Question selection request:', {
    path: event.path,
    method: event.httpMethod,
  });

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body: SelectQuestionsRequest = JSON.parse(event.body);

    // Validate request
    if (!body.categoryId || !body.playerId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'categoryId and playerId are required' }),
      };
    }

    const count = body.count || 10;

    // Get configuration from AppConfig (or use defaults)
    const reusedRatio = parseFloat(process.env.QUESTIONS_REUSED_RATIO || '0.5');
    const poolThreshold = parseInt(process.env.QUESTIONS_POOL_THRESHOLD || '1000');

    // Initialize services
    const questionService = new QuestionService();
    const redisService = new RedisService();

    // Get pool size
    const poolSize = await questionService.getQuestionPoolCount(body.categoryId);

    // Calculate reused vs new question counts
    let reusedCount = 0;
    let newCount = count;

    if (poolSize >= poolThreshold) {
      reusedCount = Math.floor(count * reusedRatio);
      newCount = count - reusedCount;
    }

    // Get seen question IDs from Redis (for today)
    const identifier = body.stakeKey || body.playerId;
    const today = new Date().toISOString().split('T')[0];
    const seenKey = `seen:${identifier}:${body.categoryId}:${today}`;
    
    const seenIds = await redisService.getSeenQuestions(seenKey);

    console.log(`Selecting questions for category ${body.categoryId}:`, {
      poolSize,
      reusedCount,
      newCount,
      seenCount: seenIds.length,
    });

    // Select questions
    const questions = await questionService.selectQuestionsForSession({
      categoryId: body.categoryId,
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: clientQuestions,
        poolSize,
        reusedCount,
        newCount,
      }),
    };
  } catch (error) {
    console.error('Error selecting questions:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to select questions',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
