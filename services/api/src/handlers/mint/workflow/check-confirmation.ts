/**
 * Step Function: Check Confirmation
 * Poll for transaction confirmation
 */

interface CheckConfirmationInput {
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
  submittedAt: string;
  attemptCount?: number;
}

interface CheckConfirmationOutput extends CheckConfirmationInput {
  confirmed: boolean;
  confirmations: number;
  attemptCount: number;
}

export const handler = async (
  input: CheckConfirmationInput
): Promise<CheckConfirmationOutput> => {
  console.log('Checking confirmation:', { txHash: input.txHash, attempt: input.attemptCount || 1 });

  const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;
  if (!blockfrostApiKey) {
    throw new Error('BLOCKFROST_API_KEY not configured');
  }

  try {
    const attemptCount = (input.attemptCount || 0) + 1;

    // In a real implementation, we would query Blockfrost for transaction status
    // For now, we'll simulate confirmation after 3 attempts
    // The actual Blockfrost integration would require:
    // 1. Query /txs/{hash} endpoint
    // 2. Check block_height and confirmations
    // 3. Return confirmation status

    /* Real implementation would be:
    const response = await fetch(`${blockfrostUrl}/txs/${input.txHash}`, {
      headers: {
        'project_id': blockfrostApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Transaction not yet visible
        return {
          ...input,
          confirmed: false,
          confirmations: 0,
          attemptCount,
        };
      }
      throw new Error(`Failed to check transaction: ${response.status}`);
    }

    const txData = await response.json();
    const confirmations = txData.block_height ? 1 : 0; // Simplified
    const confirmed = confirmations >= 1;
    */

    // Placeholder: confirm after 3 attempts
    const confirmed = attemptCount >= 3;
    const confirmations = confirmed ? 1 : 0;

    console.log('Confirmation check:', { confirmed, confirmations, attemptCount });

    return {
      ...input,
      confirmed,
      confirmations,
      attemptCount,
    };
  } catch (error) {
    console.error('Error checking confirmation:', error);
    throw error;
  }
};
