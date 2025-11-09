/**
 * Session Service
 * 
 * Handles session management including start, answer submission, and completion
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { RedisService } from './redis-service.js';
import { QuestionService } from './question-service.js';
import { LeaderboardService } from './leaderboard-service.js';
import { getAppConfigService } from './appconfig-service.js';
import type { Session, SessionQuestion, SessionResult, Question } from '@trivia-nft/shared';
import { SessionStatus } from '@trivia-nft/shared';

interface StartSessionParams {
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  categoryId: string;
}

interface SubmitAnswerParams {
  sessionId: string;
  questionIndex: number;
  optionIndex: number;
  timeMs: number;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  score: number;
}

export class SessionService {
  private redis: RedisService;
  private questionService: QuestionService;
  private leaderboardService: LeaderboardService;

  constructor() {
    this.redis = new RedisService();
    this.questionService = new QuestionService();
    this.leaderboardService = new LeaderboardService();
  }

  /**
   * Start a new session
   */
  async startSession(params: StartSessionParams): Promise<Session> {
    const { playerId, stakeKey, anonId, categoryId } = params;
    const identifier = stakeKey || anonId;
    
    if (!identifier) {
      throw new Error('Either stakeKey or anonId must be provided');
    }

    // Get configuration from AppConfig
    const appConfig = getAppConfigService();
    const config = await appConfig.getGameSettings();

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const dailyLimitKey = `limit:daily:${identifier}:${today}`;
    const sessionCount = await this.redis.get(dailyLimitKey);
    
    // Determine limit based on whether user is connected (from AppConfig)
    const dailyLimit = stakeKey 
      ? config.limits.dailySessionsConnected 
      : config.limits.dailySessionsGuest;
    
    if (sessionCount && parseInt(sessionCount) >= dailyLimit) {
      throw new Error('Daily session limit reached');
    }

    // Check cooldown
    const cooldownKey = `cooldown:${identifier}`;
    const cooldownExists = await this.redis.exists(cooldownKey);
    
    if (cooldownExists) {
      throw new Error('Session cooldown active');
    }

    // Check for active session lock
    const lockKey = `lock:session:${identifier}`;
    const existingLock = await this.redis.get(lockKey);
    
    if (existingLock) {
      throw new Error('Active session already exists');
    }

    // Get seen questions for today
    const seenKey = `seen:${identifier}:${categoryId}:${today}`;
    const seenQuestionIds = await this.redis.getSeenQuestions(seenKey);

    // Select questions using AppConfig settings
    const poolSize = await this.questionService.getQuestionPoolCount(categoryId);
    const questionsPerSession = config.session.questionsPerSession;
    const reusedCount = poolSize >= config.questions.poolThreshold 
      ? Math.floor(questionsPerSession * config.questions.reusedRatio)
      : 0;
    const newCount = poolSize >= config.questions.poolThreshold 
      ? Math.ceil(questionsPerSession * config.questions.newRatio)
      : questionsPerSession;

    const questions = await this.questionService.selectQuestionsForSession({
      categoryId,
      count: questionsPerSession,
      excludeIds: seenQuestionIds,
      reusedCount,
      newCount,
    });

    if (questions.length < config.session.questionsPerSession) {
      throw new Error('Not enough questions available for this category');
    }

    // Create session
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Prepare session questions (without correct answers for client)
    const sessionQuestions: SessionQuestion[] = questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      options: q.options,
      servedAt: now,
    }));

    // Store full questions in Redis (with correct answers)
    const sessionData = {
      id: sessionId,
      playerId,
      stakeKey: stakeKey || '',
      anonId: anonId || '',
      categoryId,
      currentQuestionIndex: '0',
      startedAt: now,
      score: '0',
      questions: JSON.stringify(questions), // Store full questions with correct answers
      answers: JSON.stringify([]), // Track answers
    };

    // Store session in Redis with 15 minute TTL
    const sessionKey = `session:${sessionId}`;
    await this.redis.hSetAll(sessionKey, sessionData);
    await this.redis.set(sessionKey, '1', 15 * 60); // Set TTL

    // Acquire session lock
    await this.redis.set(lockKey, sessionId, 15 * 60);

    // Return session (without correct answers)
    const session: Session = {
      id: sessionId,
      playerId,
      stakeKey,
      anonId,
      categoryId,
      status: SessionStatus.ACTIVE,
      currentQuestionIndex: 0,
      questions: sessionQuestions,
      score: 0,
      startedAt: now,
    };

    return session;
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.hGetAll(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      return null;
    }

    const questions: Question[] = JSON.parse(sessionData.questions || '[]');
    const answers: any[] = JSON.parse(sessionData.answers || '[]');

    // Build session questions without correct answers
    const sessionQuestions: SessionQuestion[] = questions.map((q, index) => {
      const answer = answers[index];
      return {
        questionId: q.id,
        text: q.text,
        options: q.options,
        servedAt: sessionData.startedAt,
        answeredIndex: answer?.answeredIndex,
        timeMs: answer?.timeMs,
      };
    });

    return {
      id: sessionId,
      playerId: sessionData.playerId,
      stakeKey: sessionData.stakeKey || undefined,
      anonId: sessionData.anonId || undefined,
      categoryId: sessionData.categoryId,
      status: SessionStatus.ACTIVE,
      currentQuestionIndex: parseInt(sessionData.currentQuestionIndex || '0'),
      questions: sessionQuestions,
      score: parseInt(sessionData.score || '0'),
      startedAt: sessionData.startedAt,
    };
  }

  /**
   * Submit an answer
   */
  async submitAnswer(params: SubmitAnswerParams): Promise<AnswerResult> {
    const { sessionId, questionIndex, optionIndex, timeMs } = params;

    // Get session from Redis
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.hGetAll(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      throw new Error('Session not found');
    }

    const questions: Question[] = JSON.parse(sessionData.questions || '[]');
    const answers: any[] = JSON.parse(sessionData.answers || '[]');
    const currentIndex = parseInt(sessionData.currentQuestionIndex || '0');

    // Validate question index
    if (questionIndex !== currentIndex) {
      throw new Error('Invalid question index');
    }

    if (questionIndex >= questions.length) {
      throw new Error('Question index out of bounds');
    }

    // Validate timing using AppConfig timer setting
    const appConfig = getAppConfigService();
    const config = await appConfig.getGameSettings();
    const maxTimeMs = config.session.timerSeconds * 1000;
    
    if (timeMs > maxTimeMs) {
      throw new Error('Answer submitted after timeout');
    }

    // Get the question
    const question = questions[questionIndex];
    const correct = optionIndex === question.correctIndex;

    // Update score
    const newScore = correct ? parseInt(sessionData.score || '0') + 1 : parseInt(sessionData.score || '0');

    // Record answer
    answers[questionIndex] = {
      answeredIndex: optionIndex,
      timeMs,
      correct,
    };

    // Update session in Redis
    await this.redis.hSet(sessionKey, 'score', newScore.toString());
    await this.redis.hSet(sessionKey, 'currentQuestionIndex', (questionIndex + 1).toString());
    await this.redis.hSet(sessionKey, 'answers', JSON.stringify(answers));

    // Add question to seen set
    const identifier = sessionData.stakeKey || sessionData.anonId;
    const today = new Date().toISOString().split('T')[0];
    const seenKey = `seen:${identifier}:${sessionData.categoryId}:${today}`;
    await this.redis.addSeenQuestions(seenKey, [question.id]);

    return {
      correct,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      score: newScore,
    };
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<SessionResult> {
    // Get session from Redis
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.hGetAll(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      throw new Error('Session not found');
    }

    const questions: Question[] = JSON.parse(sessionData.questions || '[]');
    const answers: any[] = JSON.parse(sessionData.answers || '[]');
    const score = parseInt(sessionData.score || '0');
    const startedAt = new Date(sessionData.startedAt);
    const endedAt = new Date();
    const totalMs = endedAt.getTime() - startedAt.getTime();

    // Determine win/loss status (6+ correct = win)
    const status = score >= 6 ? SessionStatus.WON : SessionStatus.LOST;
    const isPerfect = score === 10;

    let eligibilityId: string | undefined;

    // If perfect score, create eligibility
    if (isPerfect) {
      const isConnected = !!sessionData.stakeKey;
      
      // Get eligibility window from AppConfig
      const appConfig = getAppConfigService();
      const config = await appConfig.getGameSettings();
      const windowMinutes = isConnected 
        ? config.eligibility.connectedWindowMinutes 
        : config.eligibility.guestWindowMinutes;
      const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);

      eligibilityId = uuidv4();

      await query(
        `INSERT INTO eligibilities (id, type, category_id, player_id, stake_key, anon_id, status, expires_at, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          eligibilityId,
          'category',
          sessionData.categoryId,
          sessionData.playerId,
          sessionData.stakeKey || null,
          sessionData.anonId || null,
          'active',
          expiresAt.toISOString(),
          sessionId,
        ]
      );
    }

    // Update season points in Redis leaderboard (if connected user)
    if (sessionData.stakeKey) {
      // Get current season (for now, use a default season ID)
      // TODO: Get actual current season from database
      const seasonId = 'winter-s1';
      
      // Get points configuration from AppConfig
      const appConfig = getAppConfigService();
      const config = await appConfig.getGameSettings();
      
      // Calculate points using AppConfig values
      const points = (score * config.season.pointsPerCorrect) + (isPerfect ? config.season.perfectBonus : 0);
      const avgTimePerQuestion = totalMs / config.session.questionsPerSession;

      await this.leaderboardService.updatePlayerPoints(
        sessionData.stakeKey,
        seasonId,
        points,
        {
          perfectScores: isPerfect ? 1 : 0,
          avgAnswerTime: avgTimePerQuestion,
          sessionsUsed: 1,
          nftsMinted: 0,
          firstAchievedAt: startedAt,
        }
      );

      // Also update category leaderboard
      await this.leaderboardService.updateCategoryLeaderboard(
        sessionData.stakeKey,
        sessionData.categoryId,
        seasonId
      );
    }

    // Persist completed session to Aurora
    await query(
      `INSERT INTO sessions (id, player_id, stake_key, anon_id, category_id, status, started_at, ended_at, score, total_ms, questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        sessionData.playerId,
        sessionData.stakeKey || null,
        sessionData.anonId || null,
        sessionData.categoryId,
        status,
        sessionData.startedAt,
        endedAt.toISOString(),
        score,
        totalMs,
        JSON.stringify(
          questions.map((q, i) => ({
            qid: q.id,
            servedAt: sessionData.startedAt,
            answeredIdx: answers[i]?.answeredIndex,
            timeMs: answers[i]?.timeMs,
          }))
        ),
      ]
    );

    // Release session lock
    const identifier = sessionData.stakeKey || sessionData.anonId;
    const lockKey = `lock:session:${identifier}`;
    await this.redis.del(lockKey);

    // Increment daily session count
    const today = new Date().toISOString().split('T')[0];
    const dailyLimitKey = `limit:daily:${identifier}:${today}`;
    await this.redis.incr(dailyLimitKey);
    // Set TTL to end of day (24 hours)
    await this.redis.set(dailyLimitKey, (await this.redis.get(dailyLimitKey)) || '1', 24 * 60 * 60);

    // Set cooldown using AppConfig value
    const appConfig = getAppConfigService();
    const config = await appConfig.getGameSettings();
    const cooldownKey = `cooldown:${identifier}`;
    await this.redis.set(cooldownKey, Date.now().toString(), config.session.cooldownSeconds);

    // Delete session from Redis
    await this.redis.del(sessionKey);

    return {
      score,
      totalQuestions: 10,
      isPerfect,
      eligibilityId,
      status,
      totalMs,
    };
  }



  /**
   * Get session history for a player
   */
  async getSessionHistory(
    playerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ sessions: Session[]; total: number; hasMore: boolean }> {
    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM sessions WHERE player_id = $1',
      [playerId]
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get sessions
    const result = await query(
      `SELECT id, player_id, stake_key, anon_id, category_id, status, started_at, ended_at, score, total_ms
       FROM sessions
       WHERE player_id = $1
       ORDER BY started_at DESC
       LIMIT $2 OFFSET $3`,
      [playerId, limit, offset]
    );

    const sessions: Session[] = result.rows.map((row: any) => ({
      id: row.id,
      playerId: row.player_id,
      stakeKey: row.stake_key,
      anonId: row.anon_id,
      categoryId: row.category_id,
      status: row.status,
      currentQuestionIndex: 10, // Completed sessions have all questions answered
      questions: [], // Don't include questions in history
      score: row.score,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      totalMs: row.total_ms,
    }));

    return {
      sessions,
      total,
      hasMore: offset + limit < total,
    };
  }
}
