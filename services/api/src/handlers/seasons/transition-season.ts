/**
 * Season Transition Lambda
 * Triggered by EventBridge on quarterly schedule
 * Finalizes current season, awards prizes, and starts new season
 */

import { EventBridgeEvent } from 'aws-lambda';
import { getPool } from '../../db/connection';
import { UpstashRedisService } from '../../services/upstash-redis-service';
import { SeasonService } from '../../services/season-service';

interface SeasonTransitionEvent {
  newSeasonId: string;
  newSeasonName: string;
}

export const handler = async (event: EventBridgeEvent<'Scheduled Event', SeasonTransitionEvent>) => {
  console.log('Starting season transition', { event });

  const db = await getPool();
  const redis = new UpstashRedisService();
  const seasonService = new SeasonService(db);

  try {
    // Get current active season
    const currentSeason = await seasonService.getCurrentSeason();
    
    if (!currentSeason) {
      console.log('No active season found, skipping transition');
      return {
        statusCode: 200,
        message: 'No active season to transition',
      };
    }

    console.log('Current season:', currentSeason);

    // Step 1: Archive current season leaderboard
    console.log('Archiving current season leaderboard...');
    await archiveSeasonLeaderboard(db, redis, currentSeason.id);

    // Step 2: Award prize to top player
    console.log('Awarding prize to top player...');
    await awardSeasonPrize(db, currentSeason.id);

    // Step 3: Deactivate current season
    console.log('Deactivating current season...');
    await db.query('UPDATE seasons SET is_active = false WHERE id = $1', [currentSeason.id]);

    // Step 4: Create and activate new season
    console.log('Creating new season...');
    const newSeasonId = event.detail?.newSeasonId || generateNextSeasonId(currentSeason.id);
    const newSeasonName = event.detail?.newSeasonName || generateNextSeasonName(currentSeason.name);
    
    const newStartDate = new Date(currentSeason.endsAt);
    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + 3); // 3 months duration

    const newSeason = await seasonService.createSeason({
      id: newSeasonId,
      name: newSeasonName,
      startsAt: newStartDate,
      endsAt: newEndDate,
      graceDays: 7,
    });

    await seasonService.activateSeason(newSeason.id);
    console.log('New season created and activated:', newSeason);

    // Step 5: Initialize season_points for all active players
    console.log('Initializing season points for active players...');
    const playersInitialized = await seasonService.initializeSeasonPoints(newSeason.id);
    console.log(`Initialized season points for ${playersInitialized} players`);

    // Step 6: Reset seasonal points in Redis
    console.log('Resetting Redis leaderboards...');
    await resetRedisLeaderboards(redis, newSeason.id);

    console.log('Season transition completed successfully');

    return {
      statusCode: 200,
      message: 'Season transition completed',
      previousSeason: currentSeason.id,
      newSeason: newSeason.id,
      playersInitialized,
    };
  } catch (error) {
    console.error('Error during season transition:', error);
    throw error;
  }
};

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

/**
 * Archive the final leaderboard standings to leaderboard_snapshots
 */
async function archiveSeasonLeaderboard(
  db: any,
  redis: UpstashRedisService,
  seasonId: string
) {
  // Get final standings from Redis
  const redisKey = `ladder:global:${seasonId}`;
  const entries = await redis.zrevrange(redisKey, 0, -1);

  if (entries.length === 0) {
    console.log('No leaderboard entries to archive');
    return;
  }

  // Parse entries (format: [{ value, score }, { value, score }, ...])
  const leaderboardData: Array<{ stakeKey: string; score: number }> = [];
  for (const entry of entries) {
    leaderboardData.push({
      stakeKey: entry.value,
      score: entry.score,
    });
  }

  // Decode scores and insert into snapshots
  const snapshotDate = new Date();
  const client = await db.connect();

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
          seasonId,
          snapshotDate,
          stakeKey,
          rank + 1,
          decoded.points,
          decoded.nftsMinted,
          decoded.perfectScores,
          decoded.avgAnswerMs,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Archived ${leaderboardData.length} leaderboard entries`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Award prize NFT to the top player on the global ladder
 */
async function awardSeasonPrize(db: any, seasonId: string) {
  // Get top player from season_points
  const result = await db.query(
    `SELECT sp.stake_key, p.username
     FROM season_points sp
     JOIN players p ON p.stake_key = sp.stake_key
     WHERE sp.season_id = $1 AND p.username IS NOT NULL
     ORDER BY sp.points DESC, sp.nfts_minted DESC, sp.perfect_scores DESC,
              sp.avg_answer_ms ASC, sp.sessions_used ASC, sp.first_achieved_at ASC
     LIMIT 1`,
    [seasonId]
  );

  if (result.rows.length === 0) {
    console.log('No eligible players for season prize');
    return;
  }

  const winner = result.rows[0];
  console.log(`Season winner: ${winner.username} (${winner.stake_key})`);

  // TODO: Create eligibility for special season prize NFT
  // This would be implemented when the prize NFT catalog is ready
  // For now, just log the winner
  
  console.log('Prize eligibility would be created here for winner:', winner.stake_key);
}

/**
 * Reset Redis leaderboards for the new season
 */
async function resetRedisLeaderboards(redis: UpstashRedisService, newSeasonId: string) {
  // Delete old season leaderboards (keep for historical reference, but create new keys)
  // The new season will use new Redis keys like ladder:global:{newSeasonId}
  
  // Initialize empty leaderboard for new season
  const newGlobalKey = `ladder:global:${newSeasonId}`;
  
  // Just ensure the key exists (it will be populated as players complete sessions)
  await redis.del(newGlobalKey);
  
  console.log(`Reset Redis leaderboards for season ${newSeasonId}`);
}

/**
 * Generate next season ID based on current season
 * Format: {season}-s{number}
 */
function generateNextSeasonId(currentSeasonId: string): string {
  // Parse current season (e.g., "winter-s1" -> "winter", 1)
  const match = currentSeasonId.match(/^(\w+)-s(\d+)$/);
  
  if (!match) {
    // Fallback to simple increment
    return `season-${Date.now()}`;
  }

  const [, seasonName, seasonNumber] = match;
  const nextNumber = parseInt(seasonNumber, 10) + 1;

  // Cycle through seasons: winter -> spring -> summer -> fall -> winter
  const seasonCycle = ['winter', 'spring', 'summer', 'fall'];
  const currentIndex = seasonCycle.indexOf(seasonName.toLowerCase());
  
  if (currentIndex === -1) {
    return `${seasonName}-s${nextNumber}`;
  }

  const nextSeasonName = seasonCycle[(currentIndex + 1) % seasonCycle.length];
  
  // If we're cycling back to winter, increment the season number
  if (nextSeasonName === 'winter' && currentIndex === 3) {
    return `${nextSeasonName}-s${nextNumber}`;
  }

  return `${nextSeasonName}-s${seasonNumber}`;
}

/**
 * Generate next season name based on current season
 */
function generateNextSeasonName(currentSeasonName: string): string {
  // Parse current season name (e.g., "Winter Season 1" -> "Winter", 1)
  const match = currentSeasonName.match(/^(\w+)\s+Season\s+(\d+)$/);
  
  if (!match) {
    return `Season ${Date.now()}`;
  }

  const [, seasonName, seasonNumber] = match;
  const nextNumber = parseInt(seasonNumber, 10);

  // Cycle through seasons
  const seasonCycle = ['Winter', 'Spring', 'Summer', 'Fall'];
  const currentIndex = seasonCycle.indexOf(seasonName);
  
  if (currentIndex === -1) {
    return `${seasonName} Season ${nextNumber + 1}`;
  }

  const nextSeasonName = seasonCycle[(currentIndex + 1) % seasonCycle.length];
  
  // If we're cycling back to Winter, increment the season number
  if (nextSeasonName === 'Winter' && currentIndex === 3) {
    return `${nextSeasonName} Season ${nextNumber + 1}`;
  }

  return `${nextSeasonName} Season ${nextNumber}`;
}
