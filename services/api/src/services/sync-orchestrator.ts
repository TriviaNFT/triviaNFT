/**
 * Sync Orchestrator
 * 
 * Runs periodically to queue users for syncing based on their activity level.
 * This is the "brain" that decides who needs syncing and when.
 */

import { Pool } from 'pg';
import { SyncService, SyncPriority } from './sync-service';

export class SyncOrchestrator {
  private pool: Pool;
  private syncService: SyncService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.syncService = new SyncService(pool);
  }

  /**
   * Main orchestration logic - called by cron every 5 minutes
   */
  async orchestrate(): Promise<void> {
    const now = new Date();
    const minute = now.getMinutes();
    const hour = now.getHours();

    console.log(`[ORCHESTRATOR] Running at ${now.toISOString()}`);

    try {
      // HIGH Priority: Very active users (every 5 min)
      await this.queueActiveUsers();

      // MEDIUM Priority: Recently active users (every 15 min)
      if (minute % 15 === 0) {
        await this.queueRecentUsers();
      }

      // LOW Priority: Active today (every hour)
      if (minute === 0) {
        await this.queueTodayUsers();
      }

      // MAINTENANCE: Inactive users (once per day at 3 AM)
      if (hour === 3 && minute === 0) {
        await this.queueInactiveUsers();
      }

      // Process the queue
      await this.syncService.processQueue(20); // Process 20 users per run

      // Cleanup old queue items (once per hour)
      if (minute === 0) {
        await this.syncService.cleanupQueue();
      }

    } catch (error) {
      console.error('[ORCHESTRATOR] Error:', error);
      throw error;
    }
  }

  /**
   * Queue very active users (last 5 minutes)
   */
  private async queueActiveUsers(): Promise<void> {
    const result = await this.pool.query(`
      SELECT stake_key 
      FROM players 
      WHERE last_seen_at > NOW() - INTERVAL '5 minutes'
        AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '5 minutes')
      LIMIT 100
    `);

    for (const user of result.rows) {
      await this.syncService.queueUserSync(user.stake_key, SyncPriority.HIGH);
    }

    console.log(`[ORCHESTRATOR] Queued ${result.rows.length} active users (HIGH priority)`);
  }

  /**
   * Queue recently active users (last hour)
   */
  private async queueRecentUsers(): Promise<void> {
    const result = await this.pool.query(`
      SELECT stake_key 
      FROM players 
      WHERE last_seen_at > NOW() - INTERVAL '1 hour'
        AND last_seen_at <= NOW() - INTERVAL '5 minutes'
        AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '15 minutes')
      LIMIT 200
    `);

    for (const user of result.rows) {
      await this.syncService.queueUserSync(user.stake_key, SyncPriority.MEDIUM);
    }

    console.log(`[ORCHESTRATOR] Queued ${result.rows.length} recent users (MEDIUM priority)`);
  }

  /**
   * Queue users active today (last 24 hours)
   */
  private async queueTodayUsers(): Promise<void> {
    const result = await this.pool.query(`
      SELECT stake_key 
      FROM players 
      WHERE last_seen_at > NOW() - INTERVAL '24 hours'
        AND last_seen_at <= NOW() - INTERVAL '1 hour'
        AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '1 hour')
      LIMIT 500
    `);

    for (const user of result.rows) {
      await this.syncService.queueUserSync(user.stake_key, SyncPriority.LOW);
    }

    console.log(`[ORCHESTRATOR] Queued ${result.rows.length} today users (LOW priority)`);
  }

  /**
   * Queue inactive users (maintenance)
   */
  private async queueInactiveUsers(): Promise<void> {
    const result = await this.pool.query(`
      SELECT stake_key 
      FROM players 
      WHERE last_seen_at < NOW() - INTERVAL '24 hours'
        AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '24 hours')
      LIMIT 1000
    `);

    for (const user of result.rows) {
      await this.syncService.queueUserSync(user.stake_key, SyncPriority.MAINTENANCE);
    }

    console.log(`[ORCHESTRATOR] Queued ${result.rows.length} inactive users (MAINTENANCE priority)`);
  }
}
