/**
 * Mint Service
 * Handles NFT minting eligibilities and operations
 */

import { Pool } from 'pg';
import type {
  Eligibility,
  MintOperation,
  NFTCatalog,
} from '@trivia-nft/shared';
import { EligibilityStatus, MintStatus, NotFoundError, ValidationError } from '@trivia-nft/shared';

export class MintService {
  constructor(private db: Pool) {}

  /**
   * Get active eligibilities for a player
   * Filters out expired eligibilities
   */
  async getEligibilities(playerId: string): Promise<Eligibility[]> {
    const query = `
      SELECT 
        e.id,
        e.type,
        e.category_id as "categoryId",
        e.season_id as "seasonId",
        e.player_id as "playerId",
        e.stake_key as "stakeKey",
        e.anon_id as "anonId",
        e.status,
        e.expires_at as "expiresAt",
        e.created_at as "createdAt",
        e.session_id as "sessionId"
      FROM eligibilities e
      WHERE e.player_id = $1
        AND e.status = $2
        AND e.expires_at > NOW()
      ORDER BY e.expires_at ASC
    `;

    const result = await this.db.query(query, [
      playerId,
      EligibilityStatus.ACTIVE,
    ]);

    return result.rows.map((row) => ({
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Get a specific eligibility by ID
   */
  async getEligibility(eligibilityId: string): Promise<Eligibility | null> {
    const query = `
      SELECT 
        e.id,
        e.type,
        e.category_id as "categoryId",
        e.season_id as "seasonId",
        e.player_id as "playerId",
        e.stake_key as "stakeKey",
        e.anon_id as "anonId",
        e.status,
        e.expires_at as "expiresAt",
        e.created_at as "createdAt",
        e.session_id as "sessionId"
      FROM eligibilities e
      WHERE e.id = $1
    `;

    const result = await this.db.query(query, [eligibilityId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Validate eligibility for minting
   * Checks if eligibility exists, is active, and not expired
   */
  async validateEligibility(eligibilityId: string): Promise<Eligibility> {
    const eligibility = await this.getEligibility(eligibilityId);

    if (!eligibility) {
      throw new NotFoundError('Eligibility not found');
    }

    if (eligibility.status !== EligibilityStatus.ACTIVE) {
      throw new ValidationError(
        `Eligibility is ${eligibility.status}, cannot mint`
      );
    }

    const expiresAt = new Date(eligibility.expiresAt);
    if (expiresAt <= new Date()) {
      // Mark as expired
      await this.markEligibilityExpired(eligibilityId);
      throw new ValidationError('Eligibility has expired');
    }

    return eligibility;
  }

  /**
   * Mark eligibility as used
   */
  async markEligibilityUsed(eligibilityId: string): Promise<void> {
    const query = `
      UPDATE eligibilities
      SET status = $1, used_at = NOW()
      WHERE id = $2
    `;

    await this.db.query(query, [EligibilityStatus.USED, eligibilityId]);
  }

  /**
   * Mark eligibility as expired
   */
  async markEligibilityExpired(eligibilityId: string): Promise<void> {
    const query = `
      UPDATE eligibilities
      SET status = $1
      WHERE id = $2
    `;

    await this.db.query(query, [EligibilityStatus.EXPIRED, eligibilityId]);
  }

  /**
   * Check NFT stock availability for a category
   */
  async checkStockAvailability(categoryId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as available
      FROM nft_catalog
      WHERE category_id = $1::uuid
        AND is_minted = false
        AND tier = 'category'
    `;

    const result = await this.db.query(query, [categoryId]);
    const available = parseInt(result.rows[0].available, 10);

    return available > 0;
  }

  /**
   * Get available NFT count for a category
   */
  async getAvailableNFTCount(categoryId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as available
      FROM nft_catalog
      WHERE category_id = $1::uuid
        AND is_minted = false
        AND tier = 'category'
    `;

    const result = await this.db.query(query, [categoryId]);
    return parseInt(result.rows[0].available, 10);
  }

  /**
   * Select an available NFT from catalog
   */
  async selectAvailableNFT(categoryId: string): Promise<NFTCatalog | null> {
    const query = `
      SELECT 
        id,
        category_id as "categoryId",
        name,
        description,
        s3_art_key as "s3ArtKey",
        s3_meta_key as "s3MetaKey",
        ipfs_cid as "ipfsCid",
        is_minted as "isMinted",
        minted_at as "mintedAt",
        tier,
        attributes,
        created_at as "createdAt"
      FROM nft_catalog
      WHERE category_id = $1::uuid
        AND is_minted = false
        AND tier = 'category'
      ORDER BY RANDOM()
      LIMIT 1
    `;

    const result = await this.db.query(query, [categoryId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      mintedAt: row.mintedAt ? row.mintedAt.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
      attributes: row.attributes || undefined,
    };
  }

  /**
   * Create a mint operation record
   */
  async createMintOperation(
    eligibilityId: string,
    catalogId: string,
    playerId: string,
    stakeKey: string,
    policyId: string
  ): Promise<MintOperation> {
    const query = `
      INSERT INTO mints (
        eligibility_id,
        catalog_id,
        player_id,
        stake_key,
        policy_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        eligibility_id as "eligibilityId",
        catalog_id as "catalogId",
        status,
        tx_hash as "txHash",
        error,
        created_at as "createdAt",
        confirmed_at as "confirmedAt"
    `;

    const result = await this.db.query(query, [
      eligibilityId,
      catalogId,
      playerId,
      stakeKey,
      policyId,
      MintStatus.PENDING,
    ]);

    const row = result.rows[0];
    return {
      ...row,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt || undefined,
    };
  }

  /**
   * Get mint operation by ID
   */
  async getMintOperation(mintId: string): Promise<MintOperation | null> {
    const query = `
      SELECT 
        id,
        eligibility_id as "eligibilityId",
        catalog_id as "catalogId",
        status,
        tx_hash as "txHash",
        error,
        created_at as "createdAt",
        confirmed_at as "confirmedAt"
      FROM mints
      WHERE id = $1
    `;

    const result = await this.db.query(query, [mintId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt || undefined,
    };
  }

  /**
   * Update mint operation status
   */
  async updateMintStatus(
    mintId: string,
    status: MintStatus,
    txHash?: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE mints
      SET 
        status = $1,
        tx_hash = COALESCE($2, tx_hash),
        error = $3,
        confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
      WHERE id = $4
    `;

    await this.db.query(query, [status, txHash, error, mintId]);
  }

  /**
   * Mark NFT catalog item as minted
   */
  async markCatalogItemMinted(
    catalogId: string,
    ipfsCid: string
  ): Promise<void> {
    const query = `
      UPDATE nft_catalog
      SET 
        is_minted = true,
        minted_at = NOW(),
        ipfs_cid = $1
      WHERE id = $2
    `;

    await this.db.query(query, [ipfsCid, catalogId]);
  }

  /**
   * Create player NFT record
   */
  async createPlayerNFT(
    stakeKey: string,
    policyId: string,
    assetFingerprint: string,
    tokenName: string,
    categoryId: string,
    metadata: any,
    typeCode: string,
    mintOperationId?: string
  ): Promise<void> {
    const query = `
      INSERT INTO player_nfts (
        stake_key,
        policy_id,
        asset_fingerprint,
        token_name,
        source,
        category_id,
        tier,
        type_code,
        status,
        minted_at,
        metadata,
        mint_operation_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
    `;

    await this.db.query(query, [
      stakeKey,
      policyId,
      assetFingerprint,
      tokenName,
      'mint',
      categoryId,
      'category',
      typeCode,
      'confirmed',
      JSON.stringify(metadata),
      mintOperationId || null,
    ]);
  }

  /**
   * Get player NFT by mint operation ID
   * Used for idempotency - check if NFT already exists for a mint operation
   */
  async getNFTByMintOperation(mintOperationId: string): Promise<any | null> {
    const query = `
      SELECT 
        id,
        stake_key as "stakeKey",
        policy_id as "policyId",
        asset_fingerprint as "assetFingerprint",
        token_name as "tokenName",
        source,
        category_id as "categoryId",
        season_id as "seasonId",
        tier,
        status,
        minted_at as "mintedAt",
        burned_at as "burnedAt",
        metadata,
        mint_operation_id as "mintOperationId"
      FROM player_nfts
      WHERE mint_operation_id = $1
    `;

    const result = await this.db.query(query, [mintOperationId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      mintedAt: row.mintedAt,
      burnedAt: row.burnedAt || undefined,
    };
  }
}
