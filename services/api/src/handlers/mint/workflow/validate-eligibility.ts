/**
 * Step Function: Validate Eligibility
 * Check Aurora, mark eligibility as 'used'
 */

import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';

interface ValidateEligibilityInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
  policyId: string;
}

interface ValidateEligibilityOutput extends ValidateEligibilityInput {
  eligibilityValidated: boolean;
}

export const handler = async (
  input: ValidateEligibilityInput
): Promise<ValidateEligibilityOutput> => {
  console.log('Validating eligibility:', input);

  const db = await getPool();
  const mintService = new MintService(db);

  try {
    // Validate eligibility
    const eligibility = await mintService.validateEligibility(input.eligibilityId);

    // Verify ownership
    if (eligibility.playerId !== input.playerId) {
      throw new Error('Eligibility does not belong to this player');
    }

    // Mark as used
    await mintService.markEligibilityUsed(input.eligibilityId);

    console.log('Eligibility validated and marked as used');

    return {
      ...input,
      eligibilityValidated: true,
    };
  } catch (error) {
    console.error('Error validating eligibility:', error);
    throw error;
  }
};
