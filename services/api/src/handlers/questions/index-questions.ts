/**
 * Question Indexing Lambda Handler
 * 
 * POST /questions/index-questions
 * Reads questions from S3 and indexes them in Aurora
 * 
 * Requirements: 7, 50
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QuestionService } from '../../services/question-service.js';

interface IndexQuestionsRequest {
  s3Key: string;
}

/**
 * Lambda handler for question indexing
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Question indexing request:', {
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

    const body: IndexQuestionsRequest = JSON.parse(event.body);

    // Validate request
    if (!body.s3Key) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 's3Key is required' }),
      };
    }

    // Read questions from S3
    const questionService = new QuestionService();
    const questions = await questionService.readQuestionsFromS3(body.s3Key);

    console.log(`Read ${questions.length} questions from S3: ${body.s3Key}`);

    // Index questions in database
    const result = await questionService.indexQuestions(questions);

    console.log(`Indexed questions: ${result.inserted} inserted, ${result.duplicates} duplicates`);

    // Get updated pool count
    const categoryId = questions[0]?.categoryId;
    let poolCount = 0;
    if (categoryId) {
      poolCount = await questionService.getQuestionPoolCount(categoryId);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        s3Key: body.s3Key,
        questionsRead: questions.length,
        inserted: result.inserted,
        duplicates: result.duplicates,
        poolCount,
        message: `Successfully indexed ${result.inserted} questions (${result.duplicates} duplicates skipped)`,
      }),
    };
  } catch (error) {
    console.error('Error indexing questions:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to index questions',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
