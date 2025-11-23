/**
 * Authentication Service
 * 
 * Handles wallet connection, profile creation, and user authentication.
 */

import { query } from '../db/connection.js';
import { generateToken } from '../utils/jwt.js';
import { getAppConfigService } from './appconfig-service.js';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  type Player,
  type ConnectWalletResponse,
  type CreateProfileResponse,
  type GetCurrentUserResponse,
} from '@trivia-nft/shared';

/**
 * Convert hex-encoded CBOR address to bech32 format
 */
async function hexAddressToBech32(hexAddress: string): Promise<string> {
  try {
    const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
    const addressBytes = Buffer.from(hexAddress, 'hex');
    const address = CSL.Address.from_bytes(addressBytes);
    return address.to_bech32();
  } catch (error) {
    console.error('Failed to convert hex address to bech32:', error);
    throw new ValidationError('Invalid payment address format');
  }
}

/**
 * Connect wallet and generate JWT token
 */
export async function connectWallet(
  stakeKey: string,
  paymentAddressHex?: string
): Promise<ConnectWalletResponse> {
  // Validate stake key format
  const stakeKeyRegex = /^stake1[a-z0-9]{53}$/;
  if (!stakeKeyRegex.test(stakeKey)) {
    throw new ValidationError('Invalid stake key format');
  }

  // Convert payment address if provided
  let paymentAddress: string | undefined;
  if (paymentAddressHex) {
    console.log('[auth-service] Converting hex address to bech32:', paymentAddressHex.substring(0, 20) + '...');
    paymentAddress = await hexAddressToBech32(paymentAddressHex);
    console.log('[auth-service] Converted to bech32:', paymentAddress);
  }

  // Check if player exists
  const result = await query<Player>(
    `SELECT id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"
     FROM players
     WHERE stake_key = $1`,
    [stakeKey]
  );

  let player: Player;
  let isNewUser = false;

  if (result.rows.length === 0) {
    // Create new player record
    const insertResult = await query<Player>(
      `INSERT INTO players (stake_key, payment_address, last_seen_at)
       VALUES ($1, $2, NOW())
       RETURNING id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"`,
      [stakeKey, paymentAddress || null]
    );
    
    player = {
      id: insertResult.rows[0].id,
      stakeKey: insertResult.rows[0].stakeKey || undefined,
      anonId: insertResult.rows[0].anonId || undefined,
      username: insertResult.rows[0].username || undefined,
      email: insertResult.rows[0].email || undefined,
      paymentAddress: insertResult.rows[0].paymentAddress || undefined,
      createdAt: insertResult.rows[0].createdAt,
      lastSeenAt: insertResult.rows[0].lastSeenAt,
    };
    isNewUser = true;
  } else {
    // Update last seen timestamp and payment address if provided
    const updateResult = await query<Player>(
      `UPDATE players 
       SET last_seen_at = NOW(), payment_address = COALESCE($2, payment_address)
       WHERE id = $1
       RETURNING id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"`,
      [result.rows[0].id, paymentAddress || null]
    );
    
    player = {
      id: updateResult.rows[0].id,
      stakeKey: updateResult.rows[0].stakeKey || undefined,
      anonId: updateResult.rows[0].anonId || undefined,
      username: updateResult.rows[0].username || undefined,
      email: updateResult.rows[0].email || undefined,
      paymentAddress: updateResult.rows[0].paymentAddress || undefined,
      createdAt: updateResult.rows[0].createdAt,
      lastSeenAt: updateResult.rows[0].lastSeenAt,
    };
  }

  // Generate JWT token
  const token = await generateToken({
    sub: player.id,
    stakeKey: player.stakeKey,
    username: player.username,
  });

  return {
    token,
    player,
    isNewUser,
  };
}

/**
 * Create player profile (username and optional email)
 */
export async function createProfile(
  playerId: string,
  username: string,
  email?: string
): Promise<CreateProfileResponse> {
  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    throw new ValidationError(
      'Username can only contain letters, numbers, underscores, and hyphens'
    );
  }

  if (username.length < 3 || username.length > 20) {
    throw new ValidationError('Username must be between 3 and 20 characters');
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  // Check if username is already taken
  const usernameCheck = await query(
    `SELECT id FROM players WHERE username = $1`,
    [username]
  );

  if (usernameCheck.rows.length > 0) {
    throw new ConflictError('Username is already taken');
  }

  // Check if player exists
  const playerCheck = await query<Player>(
    `SELECT id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"
     FROM players
     WHERE id = $1`,
    [playerId]
  );

  if (playerCheck.rows.length === 0) {
    throw new NotFoundError('Player');
  }

  // Check if player already has a username
  if (playerCheck.rows[0].username) {
    throw new ConflictError('Player already has a username');
  }

  // Update player with username and email
  const result = await query<Player>(
    `UPDATE players
     SET username = $1, email = $2, last_seen_at = NOW()
     WHERE id = $3
     RETURNING id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"`,
    [username, email || null, playerId]
  );

  const player: Player = {
    id: result.rows[0].id,
    stakeKey: result.rows[0].stakeKey || undefined,
    anonId: result.rows[0].anonId || undefined,
    username: result.rows[0].username || undefined,
    email: result.rows[0].email || undefined,
    paymentAddress: result.rows[0].paymentAddress || undefined,
    createdAt: result.rows[0].createdAt,
    lastSeenAt: result.rows[0].lastSeenAt,
  };

  return {
    player,
  };
}

/**
 * Create guest user with anonymous ID and generate JWT token
 */
export async function createGuestUser(): Promise<ConnectWalletResponse> {
  // Create new guest player record with auto-generated anon_id
  const insertResult = await query<Player>(
    `INSERT INTO players (last_seen_at)
     VALUES (NOW())
     RETURNING id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"`
  );
  
  const player: Player = {
    id: insertResult.rows[0].id,
    stakeKey: insertResult.rows[0].stakeKey || undefined,
    anonId: insertResult.rows[0].anonId || undefined,
    username: insertResult.rows[0].username || undefined,
    email: insertResult.rows[0].email || undefined,
    paymentAddress: insertResult.rows[0].paymentAddress || undefined,
    createdAt: insertResult.rows[0].createdAt,
    lastSeenAt: insertResult.rows[0].lastSeenAt,
  };

  // Generate JWT token with anonId
  const token = await generateToken({
    sub: player.id,
    anonId: player.anonId,
  });

  return {
    token,
    player,
    isNewUser: true,
  };
}

/**
 * Get current user info with remaining plays
 */
export async function getCurrentUser(
  playerId: string,
  stakeKey?: string
): Promise<GetCurrentUserResponse> {
  // Fetch player info
  const result = await query<Player>(
    `SELECT id, stake_key AS "stakeKey", anon_id AS "anonId", username, email, payment_address AS "paymentAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"
     FROM players
     WHERE id = $1`,
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Player');
  }

  const player: Player = {
    id: result.rows[0].id,
    stakeKey: result.rows[0].stakeKey || undefined,
    anonId: result.rows[0].anonId || undefined,
    username: result.rows[0].username || undefined,
    email: result.rows[0].email || undefined,
    paymentAddress: result.rows[0].paymentAddress || undefined,
    createdAt: result.rows[0].createdAt,
    lastSeenAt: result.rows[0].lastSeenAt,
  };

  // Calculate remaining plays
  // Get limits from AppConfig
  const appConfig = getAppConfigService();
  const config = await appConfig.getGameSettings();
  const dailyLimit = stakeKey 
    ? config.limits.dailySessionsConnected 
    : config.limits.dailySessionsGuest;
  const remainingPlays = dailyLimit; // TODO: Get actual usage from Redis

  // Calculate reset time (midnight ET)
  const now = new Date();
  const resetAt = new Date(now);
  resetAt.setUTCHours(5, 0, 0, 0); // Midnight ET = 5 AM UTC
  if (resetAt <= now) {
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  }

  return {
    player,
    remainingPlays,
    resetAt: resetAt.toISOString(),
  };
}
