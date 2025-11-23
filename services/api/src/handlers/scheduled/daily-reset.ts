/**
 * Daily Reset Lambda
 * Triggered by EventBridge at midnight ET
 * Resets daily session limits and question seen sets in Redis
 */

import { EventBridgeEvent } from 'aws-lambda';
import { UpstashRedisService } from '../../services/upstash-redis-service';

export const handler = async (event: EventBridgeEvent<'Scheduled Event', any>) => {
  console.log('Starting daily reset', { event });

  const redis = new UpstashRedisService();

  try {
    // Get all keys for daily limits and question seen sets
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Delete yesterday's daily limit keys
    const limitPattern = `limit:daily:*:${yesterday}`;
    const limitKeys = await redis.keys(limitPattern);
    
    if (limitKeys.length > 0) {
      const deletedCount = await redis.delMultiple(limitKeys);
      console.log(`Deleted ${deletedCount} daily limit keys`);
    }

    // Delete yesterday's question seen sets
    const seenPattern = `seen:*:*:${yesterday}`;
    const seenKeys = await redis.keys(seenPattern);
    
    if (seenKeys.length > 0) {
      const deletedCount = await redis.delMultiple(seenKeys);
      console.log(`Deleted ${deletedCount} question seen sets`);
    }

    // Update daily statistics (optional)
    const statsKey = `stats:daily:${yesterday}`;
    const stats = {
      limitKeysDeleted: limitKeys.length,
      seenKeysDeleted: seenKeys.length,
      resetAt: new Date().toISOString(),
    };
    
    await redis.setWithExpiry(statsKey, JSON.stringify(stats), 'EX', 7 * 24 * 60 * 60); // Keep for 7 days

    console.log('Daily reset completed successfully', stats);

    return {
      statusCode: 200,
      message: 'Daily reset completed',
      stats,
    };
  } catch (error) {
    console.error('Error during daily reset:', error);
    throw error;
  } finally {
    await redis.close();
  }
};
