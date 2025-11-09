/**
 * Eligibility Expiration Lambda
 * Triggered by EventBridge every minute
 * Scans eligibilities table for expired entries and updates status
 */

import { EventBridgeEvent } from 'aws-lambda';
import { getPool } from '../../db/connection';

export const handler = async (event: EventBridgeEvent<'Scheduled Event', any>) => {
  console.log('Starting eligibility expiration check', { event });

  const db = await getPool();

  try {
    // Find and expire eligibilities that have passed their expiration time
    const result = await db.query(
      `UPDATE eligibilities
       SET status = 'expired'
       WHERE status = 'active' 
         AND expires_at <= NOW()
       RETURNING id, type, category_id, player_id, expires_at`
    );

    const expiredCount = result.rowCount || 0;

    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} eligibilities:`, result.rows);

      // For each expired eligibility, we could return NFTs to stock
      // However, since we don't reserve NFTs when eligibility is granted,
      // we don't need to do anything here per the design
      
      // Log the expired eligibilities for monitoring
      for (const eligibility of result.rows) {
        console.log('Expired eligibility:', {
          id: eligibility.id,
          type: eligibility.type,
          categoryId: eligibility.category_id,
          playerId: eligibility.player_id,
          expiresAt: eligibility.expires_at,
        });
      }
    } else {
      console.log('No eligibilities to expire');
    }

    return {
      statusCode: 200,
      message: 'Eligibility expiration check completed',
      expiredCount,
    };
  } catch (error) {
    console.error('Error during eligibility expiration:', error);
    throw error;
  }
};
