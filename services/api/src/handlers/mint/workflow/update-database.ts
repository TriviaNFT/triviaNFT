/**
 * Step Function: Update Database
 * Insert into mints and player_nfts tables
 */

import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';
import { MintStatus } from '@trivia-nft/shared';

interface UpdateDatabaseInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
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
    // Generate asset fingerprint (CIP-14)
    // In real implementation, this would use proper CIP-14 encoding
    const assetFingerprint = `asset1${input.assetName.substring(0, 38)}`;

    // Update mint operation status
    await mintService.updateMintStatus(
      input.mintId,
      MintStatus.CONFIRMED,
      input.txHash
    );

    // Create player NFT record
    await mintService.createPlayerNFT(
      input.stakeKey,
      input.policyId,
      assetFingerprint,
      input.tokenName,
      input.categoryId,
      input.metadata
    );

    console.log('Database updated successfully');

    return {
      ...input,
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
