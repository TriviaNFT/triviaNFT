/**
 * Sign Mint Transaction Lambda
 * Signs the mint transaction with centralized policy key
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SignMintTxInput {
  forgeId: string;
  type: 'category' | 'master' | 'season';
  stakeKey: string;
  mintTxCbor: string;
  ultimateMetadata: any;
}

interface SignMintTxOutput extends SignMintTxInput {
  signedMintTxCbor: string;
}

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (
  event: SignMintTxInput
): Promise<SignMintTxOutput> => {
  const { mintTxCbor } = event;

  try {
    // Get policy signing key from Secrets Manager
    const secretName = process.env.POLICY_SIGNING_KEY_SECRET_NAME || 'trivia-nft/policy-signing-key';
    
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await secretsClient.send(command);
    const signingKey = response.SecretString;

    if (!signingKey) {
      throw new Error('Policy signing key not found');
    }

    // Sign the transaction
    // TODO: Implement actual signing with Lucid
    // const tx = lucid.fromTx(mintTxCbor);
    // const signedTx = await tx.sign.withPrivateKey(signingKey).complete();
    // const signedTxCbor = signedTx.toString();

    const signedMintTxCbor = `signed_${mintTxCbor}`;

    return {
      ...event,
      signedMintTxCbor,
    };
  } catch (error) {
    console.error('Sign mint transaction error:', error);
    throw error;
  }
};
