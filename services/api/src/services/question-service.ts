/**
 * Question Service
 * 
 * Handles question generation, selection, and management
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { query } from '../db/connection.js';
import type { Question } from '@trivia-nft/shared';
import { QuestionSource } from '@trivia-nft/shared';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export class QuestionService {
  private bedrockClient: BedrockRuntimeClient;
  private s3Client: S3Client;
  private questionsBucket: string;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({});
    this.s3Client = new S3Client({});
    this.questionsBucket = process.env.QUESTIONS_BUCKET || 'trivia-questions';
  }

  /**
   * Generate questions using AWS Bedrock
   */
  async generateQuestions(categoryId: string, categoryName: string, count: number = 10): Promise<Question[]> {
    const prompt = this.buildPrompt(categoryName, count);
    
    try {
      // Invoke Bedrock Claude model
      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
          }),
        })
      );

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const content = responseBody.content[0].text;
      
      // Extract JSON from response (Claude may wrap it in markdown)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Bedrock response');
      }
      
      const generatedQuestions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);
      
      // Convert to Question format with hashes
      const questions: Question[] = generatedQuestions.map((q) => ({
        id: '', // Will be set by database
        categoryId,
        text: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        source: QuestionSource.BEDROCK,
        hash: this.calculateHash(q),
      }));

      // Upload to S3
      await this.uploadQuestionsToS3(categoryId, questions);

      return questions;
    } catch (error) {
      console.error('Error generating questions with Bedrock:', error);
      throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for Bedrock
   */
  private buildPrompt(categoryName: string, count: number): string {
    return `Generate ${count} trivia questions for the category: ${categoryName}

Requirements:
- Difficulty: Medium
- Format: Multiple choice with 4 options
- Each option should be a complete answer (not just A, B, C, D)
- Include one correct answer
- Provide a brief explanation (1-2 sentences) for the correct answer
- Ensure questions are factually accurate
- Avoid ambiguous wording
- Make questions engaging and interesting
- Vary the question types (who, what, when, where, why, how)

Output ONLY a JSON array with this exact structure (no additional text):
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correctIndex": 1,
    "explanation": "Paris is the capital and largest city of France, located on the Seine River."
  }
]

Generate ${count} questions now:`;
  }

  /**
   * Calculate SHA256 hash for deduplication
   */
  private calculateHash(question: GeneratedQuestion): string {
    const content = JSON.stringify({
      question: question.question.toLowerCase().trim(),
      options: question.options.map(o => o.toLowerCase().trim()).sort(),
    });
    
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Upload questions to S3
   */
  private async uploadQuestionsToS3(categoryId: string, questions: Question[]): Promise<string> {
    const timestamp = Date.now();
    const key = `${categoryId}/${timestamp}.json`;
    
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.questionsBucket,
          Key: key,
          Body: JSON.stringify(questions, null, 2),
          ContentType: 'application/json',
        })
      );
      
      console.log(`Uploaded ${questions.length} questions to S3: ${key}`);
      return key;
    } catch (error) {
      console.error('Error uploading questions to S3:', error);
      throw new Error(`Failed to upload questions to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read questions from S3
   */
  async readQuestionsFromS3(key: string): Promise<Question[]> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.questionsBucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      const content = await response.Body.transformToString();
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading questions from S3:', error);
      throw new Error(`Failed to read questions from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Index questions in database (check for duplicates)
   */
  async indexQuestions(questions: Question[]): Promise<{ inserted: number; duplicates: number }> {
    let inserted = 0;
    let duplicates = 0;

    for (const question of questions) {
      try {
        // Check if question with this hash already exists
        const existing = await query(
          'SELECT id FROM questions WHERE hash = $1',
          [question.hash]
        );

        if (existing.rows.length > 0) {
          duplicates++;
          continue;
        }

        // Insert new question
        await query(
          `INSERT INTO questions (category_id, text, options, correct_index, explanation, source, hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            question.categoryId,
            question.text,
            JSON.stringify(question.options),
            question.correctIndex,
            question.explanation,
            question.source,
            question.hash,
          ]
        );

        inserted++;
      } catch (error) {
        console.error('Error indexing question:', error);
        // Continue with next question
      }
    }

    return { inserted, duplicates };
  }

  /**
   * Get question pool count for a category
   */
  async getQuestionPoolCount(categoryId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM questions WHERE category_id = $1 AND is_active = true',
      [categoryId]
    );

    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Select questions for a session
   */
  async selectQuestionsForSession(params: {
    categoryId: string;
    count: number;
    excludeIds: string[];
    reusedCount: number;
    newCount: number;
  }): Promise<Question[]> {
    const { categoryId, count, excludeIds, reusedCount, newCount } = params;
    
    // Get pool size
    const poolSize = await this.getQuestionPoolCount(categoryId);
    
    let questions: Question[] = [];
    
    if (poolSize < 1000) {
      // Pool is small, just select random questions
      const result = await query<Question>(
        `SELECT id, category_id as "categoryId", text, options, correct_index as "correctIndex", 
                explanation, source, hash
         FROM questions
         WHERE category_id = $1 
           AND is_active = true
           AND id NOT IN (${excludeIds.length > 0 ? excludeIds.map((_, i) => `$${i + 2}`).join(',') : 'SELECT NULL'})
         ORDER BY RANDOM()
         LIMIT $${excludeIds.length + 2}`,
        [categoryId, ...excludeIds, count]
      );
      
      questions = result.rows.map((row: any) => ({
        ...row,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      }));
    } else {
      // Pool is large, mix reused and new questions
      // Get reused questions (older ones)
      const reusedResult = await query<Question>(
        `SELECT id, category_id as "categoryId", text, options, correct_index as "correctIndex",
                explanation, source, hash
         FROM questions
         WHERE category_id = $1 
           AND is_active = true
           AND id NOT IN (${excludeIds.length > 0 ? excludeIds.map((_, i) => `$${i + 2}`).join(',') : 'SELECT NULL'})
         ORDER BY created_at ASC, RANDOM()
         LIMIT $${excludeIds.length + 2}`,
        [categoryId, ...excludeIds, reusedCount]
      );
      
      const reused = reusedResult.rows.map((row: any) => ({
        ...row,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      }));
      
      // Get new questions (recent ones)
      const newResult = await query<Question>(
        `SELECT id, category_id as "categoryId", text, options, correct_index as "correctIndex",
                explanation, source, hash
         FROM questions
         WHERE category_id = $1 
           AND is_active = true
           AND id NOT IN (${[...excludeIds, ...reused.map(q => q.id)].map((_, i) => `$${i + 2}`).join(',')})
         ORDER BY created_at DESC, RANDOM()
         LIMIT $${excludeIds.length + reused.length + 2}`,
        [categoryId, ...excludeIds, ...reused.map(q => q.id), newCount]
      );
      
      const newQuestions = newResult.rows.map((row: any) => ({
        ...row,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      }));
      
      questions = [...reused, ...newQuestions];
    }
    
    // Shuffle questions
    return this.shuffleArray(questions);
  }

  /**
   * Flag a question for review
   */
  async flagQuestion(questionId: string, playerId: string, reason: string): Promise<void> {
    // Verify question exists
    const questionResult = await query(
      'SELECT id FROM questions WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      throw new Error('Question not found');
    }

    // Insert flag record
    await query(
      `INSERT INTO question_flags (question_id, player_id, reason, handled)
       VALUES ($1, $2, $3, false)`,
      [questionId, playerId, reason]
    );

    console.log(`Question ${questionId} flagged by player ${playerId}`);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }
}
