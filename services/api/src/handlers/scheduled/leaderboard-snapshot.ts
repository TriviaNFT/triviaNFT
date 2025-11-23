/**
 * Leaderboard Snapshot Lambda
 * Triggered by EventBridge daily at 1 AM ET
 * Reads Redis leaderboard and inserts into leaderboard_snapshots table
 */

import { EventBridgeEvent } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { UpstashRedisService } from '../../services/upstash-redis-service';
import { SeasonService } from '../../services/season-service';

/**
 * Decode composite score into individual components
 */
function decodeCompositeScore(score: number): {
  points: number;
  nftsMinted: number;
  perfectScores: number;
  avgAnswerMs: number;
} {
  // Score format: (points * 1e15) + (nfts * 1e12) + (perfects * 1e9) + ((1e9 - avgTime) * 1e6) + ...
  const points = Math.floor(score / 1e15);
  const remainder1 = score % 1e15;
  
  const nftsMinted = Math.floor(remainder1 / 1e12);
  const remainder2 = remainder1 % 1e12;
  
  const perfectScores = Math.floor(remainder2 / 1e9);
  const remainder3 = remainder2 % 1e9;
  
  const avgAnswerMs = Math.max(0, 1e9 - Math.floor(remainder3 / 1e6));
  
  return {
    points,
    nftsMinted,
    perfectScores,
    avgAnswerMs,
  };
}

export const handler = async (event: EventBridgeEvent<'Scheduled Event', any>) => {
  console.log('Starting leaderboard snapshot', { event });

  const db = await getPool();
  const redis = new UpstashRedisService();
  const seasonService = new SeasonService(db);

  try {
    // Get current active season
    const season = await seasonService.getCurrentSeason();
    
    if (!season) {
      console.log('No active season found, skipping snapshot');
      return {
        statusCode: 200,
        message: 'No active season to snapshot',
      };
    }

    console.log('Taking snapshot for season:', season.id);

    // Get all entries from Redis global leaderboard
    const redisKey = `ladder:global:${season.id}`;
    const entries = await redis.zrevrange(redisKey, 0, -1);

    if (entries.length === 0) {
      console.log('No leaderboard entries to snapshot');
      return {
        statusCode: 200,
        message: 'No leaderboard entries',
        season: season.id,
      };
    }

    // Parse entries (format: [{ value, score }, { value, score }, ...])
    const leaderboardData: Array<{ stakeKey: string; score: number }> = [];
    for (const entry of entries) {
      leaderboardData.push({
        stakeKey: entry.value,
        score: entry.score,
      });
    }

    console.log(`Found ${leaderboardData.length} leaderboard entries`);

    // Insert into leaderboard_snapshots
    const snapshotDate = new Date();
    const client = await db.connect();
    let insertedCount = 0;

    try {
      await client.query('BEGIN');

      for (let rank = 0; rank < leaderboardData.length; rank++) {
        const { stakeKey, score } = leaderboardData[rank];
        const decoded = decodeCompositeScore(score);

        await client.query(
          `INSERT INTO leaderboard_snapshots 
           (season_id, snapshot_date, stake_key, rank, points, nfts_minted, perfect_scores, avg_answer_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (season_id, snapshot_date, stake_key) DO UPDATE SET
             rank = EXCLUDED.rank,
             points = EXCLUDED.points,
             nfts_minted = EXCLUDED.nfts_minted,
             perfect_scores = EXCLUDED.perfect_scores,
             avg_answer_ms = EXCLUDED.avg_answer_ms`,
          [
            season.id,
            snapshotDate,
            stakeKey,
            rank + 1,
            decoded.points,
            decoded.nftsMinted,
            decoded.perfectScores,
            decoded.avgAnswerMs,
          ]
        );

        insertedCount++;
      }

      await client.query('COMMIT');
      console.log(`Snapshot completed: ${insertedCount} entries inserted`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      message: 'Leaderboard snapshot completed',
      season: season.id,
      snapshotDate: snapshotDate.toISOString(),
      entriesCount: insertedCount,
    };
  } catch (error) {
    console.error('Error during leaderboard snapshot:', error);
    throw error;
  } finally {
    await redis.close();
  }
};
