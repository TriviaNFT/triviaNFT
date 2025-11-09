/**
 * Forge Service
 * Handles NFT forging operations and progress tracking
 */

import { Pool } from 'pg';
import { getAppConfigService } from './appconfig-service.js';
import type {
  ForgeProgress,
  ForgeOperation,
  PlayerNFT,
} from '@trivia-nft/shared';
import { ForgeStatus, ForgeType } from '@trivia-nft/shared';

export class ForgeService {
  constructor(private db: Pool) {}

  /**
   * Get forging progress for a player
   * Returns progress for Category, Master, and Seasonal forging
   */
  async getForgeProgress(stakeKey: string): Promise<ForgeProgress[]> {
    // Get all owned NFTs for the player
    const nftsQuery = `
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
        created_at as "createdAt"
      FROM player_nfts
      WHERE stake_key = $1
        AND status = 'confirmed'
        AND tier = 'category'
      ORDER BY category_id, minted_at
    `;

    const nftsResult = await this.db.query(nftsQuery, [stakeKey]);
    const nfts: PlayerNFT[] = nftsResult.rows.map((row) => ({
      ...row,
      mintedAt: row.mintedAt.toISOString(),
      burnedAt: row.burnedAt ? row.burnedAt.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
    }));

    // Get current season info
    const seasonQuery = `
      SELECT id, name, ends_at as "endsAt", grace_days as "graceDays"
      FROM seasons
      WHERE is_active = true
      LIMIT 1
    `;
    const seasonResult = await this.db.query(seasonQuery);
    const currentSeason = seasonResult.rows[0] || null;

    // Get forging requirements from AppConfig
    const appConfig = getAppConfigService();
    const config = await appConfig.getGameSettings();

    // Calculate progress for each forge type
    const progress: ForgeProgress[] = [];

    // 1. Category Ultimate forging (configurable NFTs from same category)
    const categoryGroups = this.groupNFTsByCategory(nfts);
    for (const [categoryId, categoryNFTs] of Object.entries(categoryGroups)) {
      const count = categoryNFTs.length;
      const required = config.forging.categoryUltimateCount;

      progress.push({
        type: ForgeType.CATEGORY,
        categoryId,
        required,
        current: count,
        nfts: categoryNFTs.slice(0, required),
        canForge: count >= required,
      });
    }

    // 2. Master Ultimate forging (1 NFT from configurable number of different categories)
    const uniqueCategories = new Set(nfts.map((nft) => nft.categoryId).filter(Boolean));
    const masterRequired = config.forging.masterUltimateCount;
    const masterNFTs = Array.from(uniqueCategories)
      .slice(0, masterRequired)
      .map((catId) => nfts.find((nft) => nft.categoryId === catId)!)
      .filter(Boolean);

    progress.push({
      type: ForgeType.MASTER,
      required: masterRequired,
      current: uniqueCategories.size,
      nfts: masterNFTs,
      canForge: uniqueCategories.size >= masterRequired,
    });

    // 3. Seasonal Ultimate forging (configurable NFTs from each active category in current season)
    if (currentSeason) {
      const seasonalNFTs = nfts.filter((nft) => nft.seasonId === currentSeason.id);
      const seasonalCategoryGroups = this.groupNFTsByCategory(seasonalNFTs);
      
      const seasonalNFTsRequired = config.forging.seasonalUltimateCount;
      
      // Check if we have required NFTs from each category
      const categoriesWithRequiredNFTs = Object.values(seasonalCategoryGroups).filter(
        (catNFTs) => catNFTs.length >= seasonalNFTsRequired
      );
      
      // Get all categories count (should be 9 based on seed data)
      const categoriesCountQuery = `SELECT COUNT(*) as count FROM categories WHERE is_active = true`;
      const categoriesCountResult = await this.db.query(categoriesCountQuery);
      const totalCategories = parseInt(categoriesCountResult.rows[0].count, 10);
      
      const requiredCategories = totalCategories;
      const currentCategories = categoriesWithRequiredNFTs.length;
      
      // Collect required NFTs from each category that has them
      const seasonalForgeNFTs: PlayerNFT[] = [];
      for (const catNFTs of categoriesWithRequiredNFTs) {
        seasonalForgeNFTs.push(...catNFTs.slice(0, seasonalNFTsRequired));
      }

      // Check if within grace period using AppConfig grace days
      const now = new Date();
      const seasonEnd = new Date(currentSeason.endsAt);
      const graceEnd = new Date(seasonEnd.getTime() + config.forging.seasonGraceDays * 24 * 60 * 60 * 1000);
      const withinGracePeriod = now <= graceEnd;

      progress.push({
        type: ForgeType.SEASON,
        seasonId: currentSeason.id,
        required: requiredCategories,
        current: currentCategories,
        nfts: seasonalForgeNFTs,
        canForge: currentCategories >= requiredCategories && withinGracePeriod,
      });
    }

    return progress;
  }

  /**
   * Group NFTs by category ID
   */
  private groupNFTsByCategory(nfts: PlayerNFT[]): Record<string, PlayerNFT[]> {
    const groups: Record<string, PlayerNFT[]> = {};
    
    for (const nft of nfts) {
      if (!nft.categoryId) continue;
      
      if (!groups[nft.categoryId]) {
        groups[nft.categoryId] = [];
      }
      groups[nft.categoryId].push(nft);
    }
    
    return groups;
  }

  /**
   * Create a forge operation record
   */
  async createForgeOperation(
    type: 'category' | 'master' | 'season',
    stakeKey: string,
    inputFingerprints: string[],
    categoryId?: string,
    seasonId?: string
  ): Promise<ForgeOperation> {
    const query = `
      INSERT INTO forge_operations (
        type,
        stake_key,
        category_id,
        season_id,
        input_fingerprints,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        type,
        stake_key as "stakeKey",
        category_id as "categoryId",
        season_id as "seasonId",
        input_fingerprints as "inputFingerprints",
        burn_tx_hash as "burnTxHash",
        mint_tx_hash as "mintTxHash",
        output_asset_fingerprint as "outputAssetFingerprint",
        status,
        error,
        created_at as "createdAt",
        confirmed_at as "confirmedAt"
    `;

    const result = await this.db.query(query, [
      type,
      stakeKey,
      categoryId || null,
      seasonId || null,
      JSON.stringify(inputFingerprints),
      ForgeStatus.PENDING,
    ]);

    const row = result.rows[0];
    return {
      ...row,
      inputFingerprints: row.inputFingerprints,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : undefined,
    };
  }

  /**
   * Get forge operation by ID
   */
  async getForgeOperation(forgeId: string): Promise<ForgeOperation | null> {
    const query = `
      SELECT 
        id,
        type,
        stake_key as "stakeKey",
        category_id as "categoryId",
        season_id as "seasonId",
        input_fingerprints as "inputFingerprints",
        burn_tx_hash as "burnTxHash",
        mint_tx_hash as "mintTxHash",
        output_asset_fingerprint as "outputAssetFingerprint",
        status,
        error,
        created_at as "createdAt",
        confirmed_at as "confirmedAt"
      FROM forge_operations
      WHERE id = $1
    `;

    const result = await this.db.query(query, [forgeId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      inputFingerprints: row.inputFingerprints,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : undefined,
    };
  }

  /**
   * Update forge operation status
   */
  async updateForgeStatus(
    forgeId: string,
    status: ForgeStatus,
    burnTxHash?: string,
    mintTxHash?: string,
    outputAssetFingerprint?: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE forge_operations
      SET 
        status = $1,
        burn_tx_hash = COALESCE($2, burn_tx_hash),
        mint_tx_hash = COALESCE($3, mint_tx_hash),
        output_asset_fingerprint = COALESCE($4, output_asset_fingerprint),
        error = $5,
        confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
      WHERE id = $6
    `;

    await this.db.query(query, [
      status,
      burnTxHash,
      mintTxHash,
      outputAssetFingerprint,
      error,
      forgeId,
    ]);
  }

  /**
   * Mark input NFTs as burned
   */
  async markNFTsBurned(fingerprints: string[]): Promise<void> {
    const query = `
      UPDATE player_nfts
      SET 
        status = 'burned',
        burned_at = NOW()
      WHERE asset_fingerprint = ANY($1)
    `;

    await this.db.query(query, [fingerprints]);
  }

  /**
   * Create Ultimate NFT record
   */
  async createUltimateNFT(
    stakeKey: string,
    policyId: string,
    assetFingerprint: string,
    tokenName: string,
    tier: 'ultimate' | 'master' | 'seasonal',
    categoryId: string | undefined,
    seasonId: string | undefined,
    metadata: any
  ): Promise<void> {
    const query = `
      INSERT INTO player_nfts (
        stake_key,
        policy_id,
        asset_fingerprint,
        token_name,
        source,
        category_id,
        season_id,
        tier,
        status,
        minted_at,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
    `;

    await this.db.query(query, [
      stakeKey,
      policyId,
      assetFingerprint,
      tokenName,
      'forge',
      categoryId || null,
      seasonId || null,
      tier,
      'confirmed',
      JSON.stringify(metadata),
    ]);
  }

  /**
   * Validate NFT ownership
   * Checks that all fingerprints are owned by the stake key
   */
  async validateNFTOwnership(
    stakeKey: string,
    fingerprints: string[]
  ): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM player_nfts
      WHERE stake_key = $1
        AND asset_fingerprint = ANY($2)
        AND status = 'confirmed'
    `;

    const result = await this.db.query(query, [stakeKey, fingerprints]);
    const count = parseInt(result.rows[0].count, 10);

    return count === fingerprints.length;
  }

  /**
   * Get NFTs by fingerprints
   */
  async getNFTsByFingerprints(fingerprints: string[]): Promise<PlayerNFT[]> {
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
        created_at as "createdAt"
      FROM player_nfts
      WHERE asset_fingerprint = ANY($1)
        AND status = 'confirmed'
    `;

    const result = await this.db.query(query, [fingerprints]);

    return result.rows.map((row) => ({
      ...row,
      mintedAt: row.mintedAt.toISOString(),
      burnedAt: row.burnedAt ? row.burnedAt.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
