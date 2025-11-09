/**
 * Step Function: Build Transaction
 * Use Lucid to construct mint transaction
 */

interface BuildTransactionInput {
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
  attributes: any;
}

interface BuildTransactionOutput extends BuildTransactionInput {
  unsignedTx: string;
  tokenName: string;
  assetName: string;
  metadata: any;
}

export const handler = async (
  input: BuildTransactionInput
): Promise<BuildTransactionOutput> => {
  console.log('Building transaction:', input);

  try {
    // Generate token name (hex-encoded NFT name)
    const tokenName = Buffer.from(input.nftName).toString('hex');
    const assetName = `${input.policyId}${tokenName}`;

    // Build CIP-25 metadata
    const metadata = {
      '721': {
        [input.policyId]: {
          [input.nftName]: {
            name: input.nftName,
            image: input.ipfsUrl,
            mediaType: 'image/png',
            description: `TriviaNFT - ${input.nftName}`,
            attributes: input.attributes,
          },
        },
      },
    };

    // In a real implementation, we would use Lucid here to build the transaction
    // For now, we'll create a placeholder structure
    // The actual Lucid integration would require:
    // 1. Initialize Lucid with Blockfrost provider
    // 2. Select UTXOs from the minting wallet
    // 3. Build mint transaction with metadata
    // 4. Return unsigned transaction CBOR

    const unsignedTx = JSON.stringify({
      type: 'mint',
      policyId: input.policyId,
      assetName,
      tokenName,
      recipient: input.stakeKey,
      metadata,
      // In real implementation, this would be CBOR hex string from Lucid
      placeholder: true,
    });

    console.log('Transaction built:', { assetName, tokenName });

    return {
      ...input,
      unsignedTx,
      tokenName,
      assetName,
      metadata,
    };
  } catch (error) {
    console.error('Error building transaction:', error);
    throw error;
  }
};
