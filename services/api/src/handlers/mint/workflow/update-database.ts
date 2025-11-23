/**
 * Step Function: Update Database
 * Insert into mints and player_nfts tables
 */

import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';
import { MintStatus, buildAssetName, generateHexId, getCategoryCode } from '@trivia-nft/shared';

interface UpdateDatabaseInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
  categorySlug: string;
  policyId: string;
  catalogId: string;
  nftName: string;
  ipfsCid: string;
  ipfsUrl: string;
  txHash: string;
  tokenName: string;
  assetName: string;
  metadata: any;
  confirmed: boolean;
  confirmations: number;
}

interface UpdateDatabaseOutput extends UpdateDatabaseInput {
  databaseUpdated: boolean;
  assetFingerprint: string;
}

export const handler = async (
  input: UpdateDatabaseInput
): Promise<UpdateDatabaseOutput> => {
  console.log('Updating database:', { mintId: input.mintId });

  const db = await getPool();
  const mintService = new MintService(db);

  try {
    // Generate hex ID for uniqueness
    const hexId = generateHexId();
    
    // Get category code from category slug
    const categoryCode = getCategoryCode(input.categorySlug as any);
    
    // Build asset name using new naming convention
    // For Tier 1 Category NFTs: TNFT_V1_{CAT}_REG_{id}
    const assetName = buildAssetName({
      tier: 'category',
      categoryCode,
      id: hexId,
    });
    
    // Type code for Tier 1 Category NFTs
    const typeCode = 'REG';
    
    // Update metadata to include both asset_name and display_name
    // Also add CategoryCode and TierCode to attributes
    const enhancedMetadata = {
      ...input.metadata,
      name: input.nftName, // display_name (human-friendly)
      asset_name: assetName, // on-chain identifier
      attributes: [
        ...(input.metadata.attributes || []),
        { trait_type: 'CategoryCode', value: categoryCode },
        { trait_type: 'TierCode', value: typeCode },
      ],
    };
    
    // Generate asset fingerprint (CIP-14)
    // In real implementation, this would use proper CIP-14 encoding
    const assetFingerprint = `asset1${assetName.substring(0, 38)}`;

    // Update mint operation status and store token_name
    await db.query(
      `UPDATE mints SET status = $1, tx_hash = $2, token_name = $3, confirmed_at = NOW() WHERE id = $4`,
      [MintStatus.CONFIRMED, input.txHash, assetName, input.mintId]
    );

    // Create player NFT record with new naming convention
    await mintService.createPlayerNFT(
      input.stakeKey,
      input.policyId,
      assetFingerprint,
      assetName, // token_name is the asset_name
      input.categoryId,
      enhancedMetadata,
      typeCode,
      input.mintId
    );

    console.log('Database updated successfully with new naming convention');
    console.log(`Asset name: ${assetName}, Display name: ${input.nftName}`);

    return {
      ...input,
      tokenName: assetName,
      assetName: assetName,
      metadata: enhancedMetadata,
      databaseUpdated: true,
      assetFingerprint,
    };
  } catch (error) {
    console.error('Error updating database:', error);
    
    // Mark mint as failed
    await mintService.updateMintStatus(
      input.mintId,
      MintStatus.FAILED,
      input.txHash,
      error instanceof Error ? error.message : 'Database update failed'
    );

    throw error;
  }
};
