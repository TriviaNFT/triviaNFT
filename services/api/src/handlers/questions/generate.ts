/**
 * Question Generation Lambda Handler
 * 
 * POST /questions/generate
 * Generates questions using AWS Bedrock and uploads to S3
 * 
 * Requirements: 7, 36
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QuestionService } from '../../services/question-service.js';
import { query } from '../../db/connection.js';

interface GenerateQuestionsRequest {
  categoryId: string;
  count?: number;
}

/**
 * Lambda handler for question generation
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Question generation request:', {
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

    const body: GenerateQuestionsRequest = JSON.parse(event.body);

    // Validate request
    if (!body.categoryId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'categoryId is required' }),
      };
    }

    const count = body.count || 10;

    if (count < 1 || count > 100) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'count must be between 1 and 100' }),
      };
    }

    // Get category name
    const categoryResult = await query(
      'SELECT name FROM categories WHERE id = $1 AND is_active = true',
      [body.categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Category not found' }),
      };
    }

    const categoryName = categoryResult.rows[0].name;

    // Generate questions
    const questionService = new QuestionService();
    const questions = await questionService.generateQuestions(
      body.categoryId,
      categoryName,
      count
    );

    console.log(`Generated ${questions.length} questions for category ${categoryName}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        categoryId: body.categoryId,
        categoryName,
        questionsGenerated: questions.length,
        message: 'Questions generated and uploaded to S3. Run indexing to add them to the database.',
      }),
    };
  } catch (error) {
    console.error('Error generating questions:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate questions',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
