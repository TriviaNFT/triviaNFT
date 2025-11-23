/**
 * Upstash Redis Service
 * 
 * Handles Redis operations using Upstash REST API for edge compatibility
 * Replaces the traditional Redis client for Vercel deployment
 */

import { Redis } from '@upstash/redis';

export class UpstashRedisService {
  private client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('REDIS_URL and REDIS_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) must be set');
    }

    this.client = new Redis({
      url,
      token,
      // Enable automatic retries with exponential backoff
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000),
      },
    });
  }

  /**
   * Get seen question IDs for a player/category/date
   */
  async getSeenQuestions(key: string): Promise<string[]> {
    try {
      const members = await this.client.smembers(key);
      return Array.isArray(members) ? members : [];
    } catch (error) {
      console.error('Error getting seen questions:', error);
      return [];
    }
  }

  /**
   * Add question IDs to seen set
   */
  async addSeenQuestions(key: string, questionIds: string[]): Promise<void> {
    try {
      if (questionIds.length > 0) {
        // @ts-ignore - Upstash Redis types are not fully compatible with spread operator
        await this.client.sadd(key, ...questionIds);
        await this.client.expire(key, 24 * 60 * 60);
      }
    } catch (error) {
      console.error('Error adding seen questions:', error);
    }
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get<string>(key);
    } catch (error) {
      console.error('Error getting value from Redis:', error);
      return null;
    }
  }

  /**
   * Set value in Redis
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Error setting value in Redis:', error);
      throw error;
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Error deleting key from Redis:', error);
    }
  }

  /**
   * Increment value in Redis
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error('Error incrementing value in Redis:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Error checking key existence:', error);
      return false;
    }
  }

  /**
   * Get hash field
   */
  async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hget<string>(key, field) || undefined;
    } catch (error) {
      console.error('Error getting hash field:', error);
      return undefined;
    }
  }

  /**
   * Get all hash fields
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.client.hgetall<Record<string, string>>(key);
      return result || {};
    } catch (error) {
      console.error('Error getting hash:', error);
      return {};
    }
  }

  /**
   * Set hash field
   */
  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hset(key, { [field]: value });
    } catch (error) {
      console.error('Error setting hash field:', error);
      throw error;
    }
  }

  /**
   * Set multiple hash fields
   */
  async hSetAll(key: string, data: Record<string, string>): Promise<void> {
    try {
      await this.client.hset(key, data);
    } catch (error) {
      console.error('Error setting hash:', error);
      throw error;
    }
  }

  /**
   * Get sorted set members in reverse order with scores
   */
  async zrevrange(key: string, start: number, stop: number): Promise<Array<{ value: string; score: number }>> {
    try {
      // @ts-ignore - Upstash Redis types are not fully compatible
      const results = await this.client.zrange(key, start, stop, {
        rev: true,
        withScores: true,
      });
      
      // Convert flat array [value1, score1, value2, score2] to array of objects
      const formatted: Array<{ value: string; score: number }> = [];
      if (Array.isArray(results)) {
        for (let i = 0; i < results.length; i += 2) {
          formatted.push({
            value: String(results[i]),
            score: Number(results[i + 1]),
          });
        }
      }
      
      return formatted;
    } catch (error) {
      console.error('Error getting sorted set range:', error);
      return [];
    }
  }

  /**
   * Add member to sorted set with score
   */
  async zAdd(key: string, options: { score: number; value: string }): Promise<number> {
    try {
      const result = await this.client.zadd(key, { score: options.score, member: options.value });
      return result ?? 0;
    } catch (error) {
      console.error('Error adding to sorted set:', error);
      throw error;
    }
  }

  /**
   * Get cardinality (number of members) of sorted set
   */
  async zCard(key: string): Promise<number> {
    try {
      return await this.client.zcard(key);
    } catch (error) {
      console.error('Error getting sorted set cardinality:', error);
      return 0;
    }
  }

  /**
   * Get sorted set members with scores
   */
  async zRangeWithScores(
    key: string,
    start: number,
    stop: number,
    options?: { REV?: boolean }
  ): Promise<Array<{ value: string; score: number }>> {
    try {
      // @ts-ignore - Upstash Redis types are not fully compatible
      const results = await this.client.zrange(key, start, stop, {
        rev: options?.REV || false,
        withScores: true,
      });
      
      // Convert flat array [value1, score1, value2, score2] to array of objects
      const formatted: Array<{ value: string; score: number }> = [];
      if (Array.isArray(results)) {
        for (let i = 0; i < results.length; i += 2) {
          formatted.push({
            value: String(results[i]),
            score: Number(results[i + 1]),
          });
        }
      }
      
      return formatted;
    } catch (error) {
      console.error('Error getting sorted set range with scores:', error);
      return [];
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }

  /**
   * Delete multiple keys
   */
  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) {
        return 0;
      }
      return await this.client.del(...keys);
    } catch (error) {
      console.error('Error deleting multiple keys:', error);
      return 0;
    }
  }

  /**
   * Set value with expiration in seconds (EX) or milliseconds (PX)
   */
  async setWithExpiry(key: string, value: string, expiryMode: 'EX' | 'PX', time: number): Promise<void> {
    try {
      if (expiryMode === 'EX') {
        await this.client.setex(key, time, value);
      } else {
        await this.client.psetex(key, time, value);
      }
    } catch (error) {
      console.error('Error setting value with expiry:', error);
      throw error;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Error setting expiration:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection (no-op for REST API)
   */
  async close(): Promise<void> {
    // Upstash REST API doesn't require explicit connection closing
    // This method is kept for API compatibility
  }
}
