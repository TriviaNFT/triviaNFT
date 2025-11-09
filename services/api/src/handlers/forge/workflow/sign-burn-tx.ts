/**
 * Sign Burn Transaction Lambda
 * Signs the burn transaction with centralized policy key
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SignBurnTxInput {
  forgeId: string;
  stakeKey: string;
  inputFingerprints: string[];
  burnTxCbor: string;
}

interface SignBurnTxOutput extends SignBurnTxInput {
  signedBurnTxCbor: string;
}

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (
  event: SignBurnTxInput
): Promise<SignBurnTxOutput> => {
  const { burnTxCbor } = event;

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
    // const tx = lucid.fromTx(burnTxCbor);
    // const signedTx = await tx.sign.withPrivateKey(signingKey).complete();
    // const signedTxCbor = signedTx.toString();

    const signedBurnTxCbor = `signed_${burnTxCbor}`;

    return {
      ...event,
      signedBurnTxCbor,
    };
  } catch (error) {
    console.error('Sign burn transaction error:', error);
    throw error;
  }
};
