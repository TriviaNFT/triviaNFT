/**
 * Update Forge Record Lambda
 * Updates database with forge operation results
 */

import { getPool } from '../../../db/connection';
import { ForgeService } from '../../../services/forge-service';
import { ForgeStatus } from '@trivia-nft/shared';

interface UpdateForgeRecordInput {
  forgeId: string;
  type: 'category' | 'master' | 'season';
  stakeKey: string;
  categoryId?: string;
  seasonId?: string;
  inputFingerprints: string[];
  burnTxHash: string;
  mintTxHash: string;
  assetFingerprint: string;
  ultimateMetadata: any;
  assetName: string;
  displayName: string;
  typeCode: string;
}

interface UpdateForgeRecordOutput extends UpdateForgeRecordInput {
  forgeComplete: boolean;
}

export const handler = async (
  event: UpdateForgeRecordInput
): Promise<UpdateForgeRecordOutput> => {
  const {
    forgeId,
    type,
    stakeKey,
    categoryId,
    seasonId,
    inputFingerprints,
    burnTxHash,
    mintTxHash,
    assetFingerprint,
    ultimateMetadata,
    assetName,
    typeCode,
  } = event;

  try {
    const db = await getPool();
    const forgeService = new ForgeService(db);

    // Update forge operation status
    await forgeService.updateForgeStatus(
      forgeId,
      ForgeStatus.CONFIRMED,
      burnTxHash,
      mintTxHash,
      assetFingerprint
    );

    // Mark input NFTs as burned
    await forgeService.markNFTsBurned(inputFingerprints);

    // Determine tier based on type
    let tier: 'ultimate' | 'master' | 'seasonal';
    switch (type) {
      case 'category':
        tier = 'ultimate';
        break;
      case 'master':
        tier = 'master';
        break;
      case 'season':
        tier = 'seasonal';
        break;
    }

    // Create Ultimate NFT record with new asset name and type code
    const policyId = process.env.POLICY_ID || 'placeholder_policy_id';

    await forgeService.createUltimateNFT(
      stakeKey,
      policyId,
      assetFingerprint,
      assetName, // Use the new asset name format
      tier,
      categoryId,
      seasonId,
      ultimateMetadata,
      typeCode // Pass the type code (ULT, MAST, or SEAS)
    );

    console.log(`Forge operation ${forgeId} completed successfully with asset name: ${assetName}`);

    return {
      ...event,
      forgeComplete: true,
    };
  } catch (error) {
    console.error('Update forge record error:', error);
    
    // Update forge operation with error
    try {
      const db = await getPool();
      const forgeService = new ForgeService(db);
      await forgeService.updateForgeStatus(
        forgeId,
        ForgeStatus.FAILED,
        burnTxHash,
        mintTxHash,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (updateError) {
      console.error('Failed to update forge status:', updateError);
    }

    throw error;
  }
};
