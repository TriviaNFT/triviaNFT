/**
 * Validate Ownership Lambda
 * Queries blockchain to verify NFT ownership
 */

import { getPool } from '../../../db/connection';
import { ForgeService } from '../../../services/forge-service';

interface ValidateOwnershipInput {
  forgeId: string;
  stakeKey: string;
  inputFingerprints: string[];
}

interface ValidateOwnershipOutput extends ValidateOwnershipInput {
  ownershipValidated: boolean;
}

export const handler = async (
  event: ValidateOwnershipInput
): Promise<ValidateOwnershipOutput> => {
  const { stakeKey, inputFingerprints } = event;

  try {
    const db = await getPool();
    const forgeService = new ForgeService(db);

    // Validate ownership in database
    // In production, this should also query Blockfrost to verify on-chain ownership
    const ownsNFTs = await forgeService.validateNFTOwnership(
      stakeKey,
      inputFingerprints
    );

    if (!ownsNFTs) {
      throw new Error('Ownership validation failed');
    }

    // TODO: Add Blockfrost on-chain verification
    // const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;
    // const blockfrostUrl = process.env.BLOCKFROST_URL;
    // Verify each NFT is in the wallet's UTXOs

    return {
      ...event,
      ownershipValidated: true,
    };
  } catch (error) {
    console.error('Validate ownership error:', error);
    throw error;
  }
};
