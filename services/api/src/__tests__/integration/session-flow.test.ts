/**
 * Integration Tests: Complete Session Flow
 * 
 * Tests the complete session flow including:
 * - Guest session creation
 * - Wallet connection and profile creation
 * - Session with all correct answers
 * - Session with mixed answers
 * - Session timeout handling
 * - Eligibility creation for perfect score
 * 
 * Requirements: 1, 2, 5, 10
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../../services/session-service.js';
import { connectWallet, createProfile } from '../../services/auth-service.js';
import { RedisService } from '../../services/redis-service.js';
import { query } from '../../db/connection.js';

describe('Session Flow Integration Tests', () => {
  let sessionService: SessionService;
  let redisService: RedisService;
  let testCategoryId: string;
  let testPlayerId: string;
  let testStakeKey: string;
  let testAnonId: string;

  beforeAll(async () => {
    sessionService = new SessionService();
    redisService = new RedisService();

    // Create test category
    const categoryResult = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Test Category', 'Category for integration tests', true]
    );
    testCategoryId = categoryResult.rows[0].id;

    // Create test questions for the category
    for (let i = 0; i < 15; i++) {
      await query(
        `INSERT INTO questions (category_id, text, options, correct_index, explanation, source, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          testCategoryId,
          `Test question ${i + 1}?`,
          JSON.stringify([
            `Option A ${i + 1}`,
            `Option B ${i + 1}`,
            `Option C ${i + 1}`,
            `Option D ${i + 1}`,
          ]),
          0, // Correct answer is always option A
          `Explanation for question ${i + 1}`,
          'test',
          `test-hash-${i + 1}`,
        ]
      );
    }

    // Generate test identifiers
    testStakeKey = `stake1test${uuidv4().replace(/-/g, '').substring(0, 49)}`;
    testAnonId = uuidv4();
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM sessions WHERE category_id = $1', [testCategoryId]);
    await query('DELETE FROM eligibilities WHERE category_id = $1', [testCategoryId]);
    await query('DELETE FROM questions WHERE category_id = $1', [testCategoryId]);
    await query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
    await query('DELETE FROM players WHERE stake_key = $1 OR anon_id = $2', [testStakeKey, testAnonId]);

    // Clean up Redis keys
    const today = new Date().toISOString().split('T')[0];
    await redisService.del(`limit:daily:${testStakeKey}:${today}`);
    await redisService.del(`limit:daily:${testAnonId}:${today}`);
    await redisService.del(`cooldown:${testStakeKey}`);
    await redisService.del(`cooldown:${testAnonId}`);
    await redisService.del(`lock:session:${testStakeKey}`);
    await redisService.del(`lock:session:${testAnonId}`);
  });

  beforeEach(async () => {
    // Clear cooldowns and locks before each test
    await redisService.del(`cooldown:${testStakeKey}`);
    await redisService.del(`cooldown:${testAnonId}`);
    await redisService.del(`lock:session:${testStakeKey}`);
    await redisService.del(`lock:session:${testAnonId}`);
  });

  describe('Guest Session Creation', () => {
    it('should create a guest session successfully', async () => {
      // Create guest player
      const playerResult = await query(
        `INSERT INTO players (anon_id, last_seen_at)
         VALUES ($1, NOW())
         RETURNING id`,
        [testAnonId]
      );
      testPlayerId = playerResult.rows[0].id;

      // Start session
      const session = await sessionService.startSession({
        playerId: testPlayerId,
        anonId: testAnonId,
        categoryId: testCategoryId,
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.playerId).toBe(testPlayerId);
      expect(session.anonId).toBe(testAnonId);
      expect(session.categoryId).toBe(testCategoryId);
      expect(session.questions).toHaveLength(10);
      expect(session.score).toBe(0);
      expect(session.currentQuestionIndex).toBe(0);

      // Verify questions don't include correct answers
      session.questions.forEach((q) => {
        expect(q.questionId).toBeDefined();
        expect(q.text).toBeDefined();
        expect(q.options).toHaveLength(4);
        expect((q as any).correctIndex).toBeUndefined();
      });

      // Clean up
      await sessionService.completeSession(session.id);
    });

    it('should enforce session lock for guest users', async () => {
      // Start first session
      const session1 = await sessionService.startSession({
        playerId: testPlayerId,
        anonId: testAnonId,
        categoryId: testCategoryId,
      });

      // Try to start second session
      await expect(
        sessionService.startSession({
          playerId: testPlayerId,
          anonId: testAnonId,
          categoryId: testCategoryId,
        })
      ).rejects.toThrow('Active session already exists');

      // Clean up
      await sessionService.completeSession(session1.id);
    });
  });

  describe('Wallet Connection and Profile Creation', () => {
    it('should connect wallet and create profile', async () => {
      // Connect wallet
      const connectResult = await connectWallet(testStakeKey);

      expect(connectResult).toBeDefined();
      expect(connectResult.token).toBeDefined();
      expect(connectResult.player).toBeDefined();
      expect(connectResult.player.stakeKey).toBe(testStakeKey);
      expect(connectResult.isNewUser).toBe(true);

      testPlayerId = connectResult.player.id;

      // Create profile
      const username = `testuser_${Date.now()}`;
      const email = `test_${Date.now()}@example.com`;

      const profileResult = await createProfile(testPlayerId, username, email);

      expect(profileResult).toBeDefined();
      expect(profileResult.player.username).toBe(username);
      expect(profileResult.player.email).toBe(email);
    });

    it('should reject duplicate username', async () => {
      const username = `duplicate_${Date.now()}`;

      // Create first profile
      await createProfile(testPlayerId, username);

      // Create another player
      const anotherStakeKey = `stake1test${uuidv4().replace(/-/g, '').substring(0, 49)}`;
      const connectResult = await connectWallet(anotherStakeKey);

      // Try to use same username
      await expect(
        createProfile(connectResult.player.id, username)
      ).rejects.toThrow('Username is already taken');

      // Clean up
      await query('DELETE FROM players WHERE id = $1', [connectResult.player.id]);
    });
  });

  describe('Session with All Correct Answers', () => {
    it('should complete session with perfect score and create eligibility', async () => {
      // Start session
      const session = await sessionService.startSession({
        playerId: testPlayerId,
        stakeKey: testStakeKey,
        categoryId: testCategoryId,
      });

      // Submit 10 correct answers
      for (let i = 0; i < 10; i++) {
        const answerResult = await sessionService.submitAnswer({
          sessionId: session.id,
          questionIndex: i,
          optionIndex: 0, // Correct answer
          timeMs: 5000,
        });

        expect(answerResult.correct).toBe(true);
        expect(answerResult.score).toBe(i + 1);
        expect(answerResult.correctIndex).toBe(0);
        expect(answerResult.explanation).toBeDefined();
      }

      // Complete session
      const result = await sessionService.completeSession(session.id);

      expect(result.score).toBe(10);
      expect(result.totalQuestions).toBe(10);
      expect(result.isPerfect).toBe(true);
      expect(result.eligibilityId).toBeDefined();
      expect(result.status).toBe('won');

      // Verify eligibility was created
      const eligibilityResult = await query(
        `SELECT * FROM eligibilities WHERE id = $1`,
        [result.eligibilityId]
      );

      expect(eligibilityResult.rows).toHaveLength(1);
      expect(eligibilityResult.rows[0].status).toBe('active');
      expect(eligibilityResult.rows[0].type).toBe('category');
      expect(eligibilityResult.rows[0].category_id).toBe(testCategoryId);

      // Verify session was persisted
      const sessionResult = await query(
        `SELECT * FROM sessions WHERE id = $1`,
        [session.id]
      );

      expect(sessionResult.rows).toHaveLength(1);
      expect(sessionResult.rows[0].score).toBe(10);
      expect(sessionResult.rows[0].status).toBe('won');
    });
  });

  describe('Session with Mixed Answers', () => {
    it('should complete session with mixed correct/incorrect answers', async () => {
      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await redisService.del(`cooldown:${testStakeKey}`);

      // Start session
      const session = await sessionService.startSession({
        playerId: testPlayerId,
        stakeKey: testStakeKey,
        categoryId: testCategoryId,
      });

      // Submit mixed answers (7 correct, 3 incorrect)
      const answerPattern = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // 0 = correct, 1 = incorrect

      for (let i = 0; i < 10; i++) {
        const answerResult = await sessionService.submitAnswer({
          sessionId: session.id,
          questionIndex: i,
          optionIndex: answerPattern[i],
          timeMs: 6000,
        });

        const expectedCorrect = answerPattern[i] === 0;
        expect(answerResult.correct).toBe(expectedCorrect);
      }

      // Complete session
      const result = await sessionService.completeSession(session.id);

      expect(result.score).toBe(7);
      expect(result.totalQuestions).toBe(10);
      expect(result.isPerfect).toBe(false);
      expect(result.eligibilityId).toBeUndefined(); // No eligibility for non-perfect score
      expect(result.status).toBe('won'); // 7 >= 6, so it's a win
    });

    it('should mark session as lost with less than 6 correct answers', async () => {
      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await redisService.del(`cooldown:${testStakeKey}`);

      // Start session
      const session = await sessionService.startSession({
        playerId: testPlayerId,
        stakeKey: testStakeKey,
        categoryId: testCategoryId,
      });

      // Submit answers (5 correct, 5 incorrect)
      const answerPattern = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];

      for (let i = 0; i < 10; i++) {
        await sessionService.submitAnswer({
          sessionId: session.id,
          questionIndex: i,
          optionIndex: answerPattern[i],
          timeMs: 7000,
        });
      }

      // Complete session
      const result = await sessionService.completeSession(session.id);

      expect(result.score).toBe(5);
      expect(result.status).toBe('lost'); // 5 < 6, so it's a loss
      expect(result.eligibilityId).toBeUndefined();
    });
  });

  describe('Session Timeout Handling', () => {
    it('should reject answer submitted after timeout', async () => {
      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await redisService.del(`cooldown:${testStakeKey}`);

      // Start session
      const session = await sessionService.startSession({
        playerId: testPlayerId,
        stakeKey: testStakeKey,
        categoryId: testCategoryId,
      });

      // Try to submit answer with time > 10 seconds
      await expect(
        sessionService.submitAnswer({
          sessionId: session.id,
          questionIndex: 0,
          optionIndex: 0,
          timeMs: 11000, // Over 10 second limit
        })
      ).rejects.toThrow('Answer submitted after timeout');

      // Clean up
      await sessionService.completeSession(session.id);
    });
  });

  describe('Daily Limit Enforcement', () => {
    it('should enforce daily session limit for connected users', async () => {
      // Set daily limit to max (10 for connected users)
      const today = new Date().toISOString().split('T')[0];
      const dailyLimitKey = `limit:daily:${testStakeKey}:${today}`;
      await redisService.set(dailyLimitKey, '10', 24 * 60 * 60);

      // Try to start another session
      await expect(
        sessionService.startSession({
          playerId: testPlayerId,
          stakeKey: testStakeKey,
          categoryId: testCategoryId,
        })
      ).rejects.toThrow('Daily session limit reached');

      // Clean up
      await redisService.del(dailyLimitKey);
    });
  });

  describe('Cooldown Enforcement', () => {
    it('should enforce cooldown between sessions', async () => {
      // Set cooldown
      const cooldownKey = `cooldown:${testStakeKey}`;
      await redisService.set(cooldownKey, Date.now().toString(), 60);

      // Try to start session during cooldown
      await expect(
        sessionService.startSession({
          playerId: testPlayerId,
          stakeKey: testStakeKey,
          categoryId: testCategoryId,
        })
      ).rejects.toThrow('Session cooldown active');

      // Clean up
      await redisService.del(cooldownKey);
    });
  });
});
