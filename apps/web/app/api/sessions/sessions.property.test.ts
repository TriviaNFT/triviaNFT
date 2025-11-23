/**
 * Property-based tests for session endpoints
 * 
 * Task 18.3: Write property test for session creation
 * Task 18.4: Write property test for eligibility creation
 * 
 * Property 5: Session Creation Success
 * Property 6: Perfect Score Eligibility Creation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { SessionService } from '../../../../../services/api/src/services/session-service';
import { generateToken } from '../../../../../services/api/src/utils/jwt';
import { query, getPool } from '../../../../../services/api/src/db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Property-Based Tests: Session Endpoints', () => {
  let testCategoryId: string;
  let createdPlayerIds: string[] = [];

  beforeAll(async () => {
    // Get or create a test category
    const categoryResult = await query(
      `SELECT id FROM categories LIMIT 1`
    );
    
    if (categoryResult.rows.length > 0) {
      testCategoryId = categoryResult.rows[0].id;
    } else {
      // Create a test category if none exists
      const insertResult = await query(
        `INSERT INTO categories (id, name, description, icon)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [uuidv4(), 'Test Category', 'Test Description', 'test-icon']
      );
      testCategoryId = insertResult.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up all created test players
    const pool = await getPool();
    if (createdPlayerIds.length > 0) {
      await pool.query(
        'DELETE FROM sessions WHERE player_id = ANY($1)',
        [createdPlayerIds]
      );
      await pool.query(
        'DELETE FROM eligibilities WHERE player_id = ANY($1)',
        [createdPlayerIds]
      );
      await pool.query(
        'DELETE FROM players WHERE id = ANY($1)',
        [createdPlayerIds]
      );
    }
  });

  /**
   * Property 5: Session Creation Success
   * 
   * For any valid session parameters (player ID, category ID), 
   * the system should successfully create and persist a session record 
   * with correct initial state.
   * 
   * Validates: Requirements 9.1
   */
  it('Property 5: Session Creation Success', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid stake keys
        fc.record({
          stakeKey: fc.constantFrom(
            'stake1u8pcjgmx7962w6hey5hhsd502araxp26kdtgagakhaqtq8squng76',
            'stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zqgtu2qw',
            'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy'
          ),
        }),
        async ({ stakeKey }) => {
          // Create test player
          const playerResult = await query(
            `INSERT INTO players (stake_key, last_seen_at)
             VALUES ($1, NOW())
             RETURNING id`,
            [stakeKey]
          );
          const playerId = playerResult.rows[0].id;
          createdPlayerIds.push(playerId);

          // Start session
          const sessionService = new SessionService();
          const session = await sessionService.startSession({
            playerId,
            stakeKey,
            categoryId: testCategoryId,
          });

          // Verify session was created with correct initial state
          expect(session).toBeDefined();
          expect(session.id).toBeDefined();
          expect(session.playerId).toBe(playerId);
          expect(session.categoryId).toBe(testCategoryId);
          expect(session.currentQuestionIndex).toBe(0);
          expect(session.score).toBe(0);
          expect(session.questions).toHaveLength(10);
          expect(session.startedAt).toBeDefined();

          // Verify each question has required structure
          session.questions.forEach((question) => {
            expect(question.questionId).toBeDefined();
            expect(question.text).toBeDefined();
            expect(question.options).toHaveLength(4);
            expect(question.servedAt).toBeDefined();
          });
        }
      ),
      { numRuns: 10 } // Run 10 times with different stake keys
    );
  });

  /**
   * Property 6: Perfect Score Eligibility Creation
   * 
   * For any completed session with a perfect score (10/10), 
   * the system should automatically create an eligibility record 
   * with correct expiration time based on player type.
   * 
   * Validates: Requirements 9.2
   */
  it('Property 6: Perfect Score Eligibility Creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random player types (connected vs guest)
        fc.record({
          isConnected: fc.boolean(),
          stakeKey: fc.constantFrom(
            'stake1u8pcjgmx7962w6hey5hhsd502araxp26kdtgagakhaqtq8squng78',
            'stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zqgtu2qx'
          ),
        }),
        async ({ isConnected, stakeKey }) => {
          // Create test player
          const playerResult = await query(
            `INSERT INTO players (stake_key, last_seen_at)
             VALUES ($1, NOW())
             RETURNING id, anon_id`,
            [isConnected ? stakeKey : null]
          );
          const playerId = playerResult.rows[0].id;
          const anonId = playerResult.rows[0].anon_id;
          createdPlayerIds.push(playerId);

          // Start session
          const sessionService = new SessionService();
          const session = await sessionService.startSession({
            playerId,
            stakeKey: isConnected ? stakeKey : undefined,
            anonId: isConnected ? undefined : anonId,
            categoryId: testCategoryId,
          });

          // Get questions with correct answers (from Redis)
          const sessionData = await sessionService['redis'].hGetAll(`session:${session.id}`);
          const questions = JSON.parse(sessionData.questions || '[]');

          // Answer all questions correctly
          for (let i = 0; i < 10; i++) {
            await sessionService.submitAnswer({
              sessionId: session.id,
              questionIndex: i,
              optionIndex: questions[i].correctIndex,
              timeMs: 5000,
            });
          }

          // Complete session
          const result = await sessionService.completeSession(session.id);

          // Verify perfect score
          expect(result.score).toBe(10);
          expect(result.isPerfect).toBe(true);
          expect(result.eligibilityId).toBeDefined();

          // Verify eligibility was created
          const eligibilityResult = await query(
            `SELECT id, expires_at, player_id, category_id, status
             FROM eligibilities
             WHERE id = $1`,
            [result.eligibilityId]
          );

          expect(eligibilityResult.rows).toHaveLength(1);
          const eligibility = eligibilityResult.rows[0];
          expect(eligibility.player_id).toBe(playerId);
          expect(eligibility.category_id).toBe(testCategoryId);
          expect(eligibility.status).toBe('active');

          // Verify expiration time is correct based on player type
          const expiresAt = new Date(eligibility.expires_at);
          const now = new Date();
          const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

          if (isConnected) {
            // Connected users: 60 minutes
            expect(diffMinutes).toBeGreaterThan(55);
            expect(diffMinutes).toBeLessThan(65);
          } else {
            // Guest users: 25 minutes
            expect(diffMinutes).toBeGreaterThan(20);
            expect(diffMinutes).toBeLessThan(30);
          }
        }
      ),
      { numRuns: 10 } // Run 10 times with different player types
    );
  });
});
