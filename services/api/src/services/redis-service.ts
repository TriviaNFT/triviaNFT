/**
 * Redis Service
 * 
 * Handles Redis operations for session state, caching, and leaderboards
 */

import { createClient } from 'redis';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

interface RedisSecret {
  host: string;
  port: number;
  password: string;
}

let clientInstance: any = null;
let secretsCache: Map<string, { value: RedisSecret; expiresAt: number }> = new Map();

export class RedisService {
  private client: any = null;

  constructor() {
    // Client will be initialized on first use
  }

  /**
   * Get Redis configuration from environment or Secrets Manager
   */
  private async getRedisConfig(): Promise<RedisConfig> {
    // If REDIS_URL is set (local development), use it
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        tls: url.protocol === 'rediss:',
      };
    }

    // Otherwise, get from Secrets Manager
    const secretArn = process.env.REDIS_SECRET_ARN;
    if (!secretArn) {
      throw new Error('REDIS_URL or REDIS_SECRET_ARN must be set');
    }

    // Check cache first (5 minute TTL)
    const cached = secretsCache.get(secretArn);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        host: cached.value.host,
        port: cached.value.port,
        password: cached.value.password,
        tls: process.env.NODE_ENV === 'production',
      };
    }

    const client = new SecretsManagerClient({});

    try {
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secretArn,
        })
      );

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret: RedisSecret = JSON.parse(response.SecretString);

      // Cache for 5 minutes
      secretsCache.set(secretArn, {
        value: secret,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return {
        host: secret.host,
        port: secret.port,
        password: secret.password,
        tls: process.env.NODE_ENV === 'production',
      };
    } catch (error) {
      console.error('Error retrieving Redis credentials:', error);
      throw error;
    }
  }

  

  /**

   * Get or create Redis client
   */
  private async getClient(): Promise<any> {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    if (clientInstance && clientInstance.isOpen) {
      this.client = clientInstance;
      return this.client;
    }

    const config = await this.getRedisConfig();

    const client = createClient({
      socket: {
        host: config.host,
        port: config.port,
        tls: config.tls,
      },
      password: config.password,
    });

    client.on('error', (err: Error) => {
      console.error('Redis client error:', err);
    });

    await client.connect();

    clientInstance = client;
    this.client = client;

    return client;
  }

  /**
   * Get seen question IDs for a player/category/date
   */
  async getSeenQuestions(key: string): Promise<string[]> {
    try {
      const client = await this.getClient();
      const members = await client.sMembers(key);
      return members;
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
      const client = await this.getClient();
      if (questionIds.length > 0) {
        await client.sAdd(key, questionIds);
        await client.expire(key, 24 * 60 * 60);
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
      const client = await this.getClient();
      return await client.get(key);
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
      const client = await this.getClient();
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
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
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      console.error('Error deleting key from Redis:', error);
    }
  }

  /**
   * Increment value in Redis
   */
  async incr(key: string): Promise<number> {
    try {
      const client = await this.getClient();
      return await client.incr(key);
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
      const client = await this.getClient();
      const result = await client.exists(key);
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
      const client = await this.getClient();
      return await client.hGet(key, field);
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
      const client = await this.getClient();
      return await client.hGetAll(key);
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
      const client = await this.getClient();
      await client.hSet(key, field, value);
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
      const client = await this.getClient();
      await client.hSet(key, data);
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
      const client = await this.getClient();
      const results = await client.zRangeWithScores(key, start, stop, { REV: true });
      return results;
    } catch (error) {
      console.error('Error getting sorted set range:', error);
      return [];
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await this.getClient();
      return await client.keys(pattern);
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
      const client = await this.getClient();
      return await client.del(keys);
    } catch (error) {
      console.error('Error deleting multiple keys:', error);
      return 0;
    }
  }

  /**
   * Set value with expiration in seconds (EX option)
   */
  async setWithExpiry(key: string, value: string, expiryMode: 'EX' | 'PX', time: number): Promise<void> {
    try {
      const client = await this.getClient();
      if (expiryMode === 'EX') {
        await client.setEx(key, time, value);
      } else {
        await client.pSetEx(key, time, value);
      }
    } catch (error) {
      console.error('Error setting value with expiry:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.client = null;
    }
    if (clientInstance && clientInstance.isOpen) {
      await clientInstance.quit();
      clientInstance = null;
    }
  }
}
