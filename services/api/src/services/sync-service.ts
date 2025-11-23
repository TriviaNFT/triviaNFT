/**
 * Scalable Wallet Sync Service
 * 
 * This service manages syncing user wallets with the blockchain in a scalable way.
 * It uses a priority queue system to ensure active users get synced first.
 */

import { Pool } from 'pg';
import { Lucid, Blockfrost } from 'lucid-cardano';

// Priority levels for sync operations
export enum SyncPriority {
  CRITICAL = 1,  // Just minted/forged - sync immediately
  HIGH = 2,      // Active now (< 5 min)
  MEDIUM = 3,    // Recently active (< 1 hour)
  LOW = 4,       // Active today (< 24 hours)
  MAINTENANCE = 5 // Inactive (> 24 hours)
}

export class SyncService {
  private pool: Pool;
  private blockfrostUrl: string;
  private blockfrostProjectId: string;
  private network: 'Mainnet' | 'Preprod';

  constructor(pool: Pool) {
    this.pool = pool;
    this.blockfrostProjectId = process.env.BLOCKFROST_PROJECT_ID || '';
    const net = (process.env.CARDANO_NETWORK || 'preprod').toLowerCase();
    this.network = net === 'mainnet' ? 'Mainnet' : 'Preprod';
    this.blockfrostUrl = `https://cardano-${this.network.toLowerCase()}.blockfrost.io/api/v0`;

    if (!this.blockfrostProjectId) {
      throw new Error('BLOCKFROST_PROJECT_ID is required for sync service');
    }
  }

  /**
   * Add a user to the sync queue
   */
  async queueUserSync(stakeKey: string, priority: SyncPriority = SyncPriority.MEDIUM): Promise<void> {
    try {
      // Check if already queued
      const existing = await this.pool.query(`
        SELECT id FROM sync_queue
        WHERE stake_key = $1 AND status IN ('pending', 'processing')
        LIMIT 1
      `, [stakeKey]);

      if (existing.rows.length > 0) {
        // Update priority if higher (lower number = higher priority)
        await this.pool.query(`
          UPDATE sync_queue
          SET priority = LEAST(priority, $1)
          WHERE stake_key = $2 AND status IN ('pending', 'processing')
        `, [priority, stakeKey]);
        console.log(`[SYNC] Updated priority for ${stakeKey.substring(0, 20)}... to ${priority}`);
      } else {
        // Add new queue item
        await this.pool.query(`
          INSERT INTO sync_queue (stake_key, priority, status, created_at)
          VALUES ($1, $2, 'pending', NOW())
        `, [stakeKey, priority]);
        console.log(`[SYNC] Queued ${stakeKey.substring(0, 20)}... with priority ${priority}`);
      }
    } catch (error) {
      console.error('[SYNC] Error queuing user:', error);
      throw error;
    }
  }

  /**
   * Process the sync queue (called by cron job)
   */
  async processQueue(batchSize: number = 10): Promise<{ synced: number; failed: number }> {
    const startTime = Date.now();
    let synced = 0;
    let failed = 0;

    try {
      // Get pending items from queue, ordered by priority
      const queueItems = await this.pool.query(`
        SELECT id, stake_key, priority, attempts
        FROM sync_queue
        WHERE status = 'pending'
        ORDER BY priority ASC, created_at ASC
        LIMIT $1
      `, [batchSize]);

      console.log(`[SYNC] Processing ${queueItems.rows.length} users from queue`);

      for (const item of queueItems.rows) {
        try {
          // Mark as processing
          await this.pool.query(`
            UPDATE sync_queue
            SET status = 'processing', started_at = NOW(), attempts = attempts + 1
            WHERE id = $1
          `, [item.id]);

          // Perform sync
          await this.syncUserWallet(item.stake_key);

          // Mark as completed
          await this.pool.query(`
            UPDATE sync_queue
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
          `, [item.id]);

          // Update player's last_synced_at
          await this.pool.query(`
            UPDATE players
            SET last_synced_at = NOW()
            WHERE stake_key = $1
          `, [item.stake_key]);

          synced++;
          console.log(`[SYNC] ✅ Synced ${item.stake_key.substring(0, 20)}...`);

        } catch (error) {
          failed++;
          console.error(`[SYNC] ❌ Failed to sync ${item.stake_key}:`, error);

          // Mark as failed or retry
          const maxAttempts = 3;
          if (item.attempts >= maxAttempts - 1) {
            await this.pool.query(`
              UPDATE sync_queue
              SET status = 'failed', error_message = $1, completed_at = NOW()
              WHERE id = $2
            `, [error instanceof Error ? error.message : String(error), item.id]);
          } else {
            // Reset to pending for retry
            await this.pool.query(`
              UPDATE sync_queue
              SET status = 'pending'
              WHERE id = $1
            `, [item.id]);
          }
        }
      }

      // Log metrics
      const duration = Date.now() - startTime;
      await this.pool.query(`
        INSERT INTO sync_metrics (users_queued, users_synced, duration_ms, errors)
        VALUES ($1, $2, $3, $4)
      `, [queueItems.rows.length, synced, duration, failed]);

      console.log(`[SYNC] Batch complete - Synced: ${synced}, Failed: ${failed}, Duration: ${duration}ms`);

      return { synced, failed };

    } catch (error) {
      console.error('[SYNC] Error processing queue:', error);
      throw error;
    }
  }

  /**
   * Sync a single user's wallet with the blockchain
   */
  private async syncUserWallet(stakeKey: string): Promise<void> {
    try {
      // Get user's payment address
      const playerResult = await this.pool.query(
        'SELECT payment_address FROM players WHERE stake_key = $1',
        [stakeKey]
      );

      if (playerResult.rows.length === 0) {
        throw new Error('Player not found');
      }

      const paymentAddress = playerResult.rows[0].payment_address;
      if (!paymentAddress) {
        throw new Error('Payment address not found');
      }

      // Initialize Lucid
      const lucid = await Lucid.new(
        new Blockfrost(this.blockfrostUrl, this.blockfrostProjectId),
        this.network
      );

      // Get UTXOs from blockchain
      const utxos = await lucid.provider.getUtxos(paymentAddress);

      // Get current NFTs from database
      const dbNfts = await this.pool.query(`
        SELECT asset_fingerprint, status
        FROM player_nfts
        WHERE stake_key = $1 AND status IN ('confirmed', 'pending')
      `, [stakeKey]);

      const dbFingerprints = new Set(dbNfts.rows.map(row => row.asset_fingerprint));
      const blockchainFingerprints = new Set<string>();

      // Process blockchain NFTs
      for (const utxo of utxos) {
        for (const [unit, amount] of Object.entries(utxo.assets)) {
          if (unit === 'lovelace') continue;
          if (amount <= 0n) continue;

          // Extract policy ID and asset name
          const policyId = unit.slice(0, 56);
          const assetNameHex = unit.slice(56);

          blockchainFingerprints.add(unit);

          // Check if NFT exists in database
          if (!dbFingerprints.has(unit)) {
            // New NFT found - add to database
            console.log(`[SYNC] Found new NFT: ${unit}`);
            
            try {
              const tokenName = Buffer.from(assetNameHex, 'hex').toString('utf8');
              
              await this.pool.query(`
                INSERT INTO player_nfts (
                  stake_key, policy_id, asset_fingerprint, token_name,
                  source, status, minted_at, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
                ON CONFLICT (asset_fingerprint) DO NOTHING
              `, [
                stakeKey,
                policyId,
                unit,
                tokenName,
                'external', // Came from outside our app
                'confirmed',
                JSON.stringify({ name: tokenName })
              ]);
            } catch (insertError) {
              console.error(`[SYNC] Error inserting NFT ${unit}:`, insertError);
            }
          }
        }
      }

      // Mark NFTs no longer in wallet as transferred
      for (const dbNft of dbNfts.rows) {
        if (!blockchainFingerprints.has(dbNft.asset_fingerprint) && dbNft.status === 'confirmed') {
          console.log(`[SYNC] NFT transferred out: ${dbNft.asset_fingerprint}`);
          
          await this.pool.query(`
            UPDATE player_nfts
            SET status = 'transferred', burned_at = NOW()
            WHERE asset_fingerprint = $1 AND stake_key = $2
          `, [dbNft.asset_fingerprint, stakeKey]);
        }
      }

      console.log(`[SYNC] Wallet synced - Blockchain: ${blockchainFingerprints.size}, Database: ${dbFingerprints.size}`);

    } catch (error) {
      console.error(`[SYNC] Error syncing wallet for ${stakeKey}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old completed queue items
   */
  async cleanupQueue(): Promise<void> {
    await this.pool.query(`
      DELETE FROM sync_queue
      WHERE status IN ('completed', 'failed')
        AND completed_at < NOW() - INTERVAL '24 hours'
    `);
  }
}
