/**
 * Step Function: Sign Transaction
 * Sign with centralized policy key from Secrets Manager
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface SignTransactionInput {
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
  unsignedTx: string;
  tokenName: string;
  assetName: string;
  metadata: any;
}

interface SignTransactionOutput extends SignTransactionInput {
  signedTx: string;
}

export const handler = async (
  input: SignTransactionInput
): Promise<SignTransactionOutput> => {
  console.log('Signing transaction:', { mintId: input.mintId });

  try {
    // Get policy signing key from Secrets Manager
    const secretName = process.env.POLICY_SIGNING_KEY_SECRET || 'trivia-nft/policy-signing-key';

    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const secretResponse = await secretsClient.send(command);
    
    if (!secretResponse.SecretString) {
      throw new Error('Policy signing key not found in Secrets Manager');
    }

    const secret = JSON.parse(secretResponse.SecretString);
    const signingKey = secret.signingKey;

    if (!signingKey) {
      throw new Error('Signing key not found in secret');
    }

    // In a real implementation, we would use Lucid here to sign the transaction
    // For now, we'll create a placeholder
    // The actual Lucid integration would require:
    // 1. Parse unsigned transaction CBOR
    // 2. Sign with policy key
    // 3. Return signed transaction CBOR

    const signedTx = JSON.stringify({
      ...JSON.parse(input.unsignedTx),
      signed: true,
      signature: 'placeholder_signature',
      // In real implementation, this would be signed CBOR hex string
    });

    console.log('Transaction signed');

    return {
      ...input,
      signedTx,
    };
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
};
