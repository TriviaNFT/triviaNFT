/**
 * Mint Workflow - Inngest Function
 * 
 * Orchestrates the NFT minting process:
 * 1. Validate eligibility (ownership, expiration, usage)
 * 2. Check NFT stock availability
 * 3. Reserve NFT from catalog
 * 4. Create mint operation record
 * 5. Submit blockchain transaction
 * 6. Wait for confirmation (2 minutes)
 * 7. Check transaction status
 * 8. Update mint operation status
 * 9. Mark eligibility as used
 * 10. Create player_nfts record
 * 
 * Requirements: 3.1, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { inngest } from '../../src/lib/inngest';
import { getPool } from '../../../../services/api/src/db/connection';
import { MintService } from '../../../../services/api/src/services/mint-service';
import { CardanoService } from '../../../../services/api/src/services/cardano-service';
import { MintStatus } from '@trivia-nft/shared';
import { NonRetriableError } from 'inngest';

/**
 * Event payload for mint/initiated event
 */
interface MintInitiatedEvent {
  name: 'mint/initiated';
  data: {
    eligibilityId: string;
    playerId: string;
    stakeKey: string;
    paymentAddress: string;
  };
}

/**
 * Mint workflow function
 * 
 * Triggered by: mint/initiated event
 * Retries: Each step retries independently up to 3 times
 * Timeout: 15 minutes total
 */
export const mintWorkflow = inngest.createFunction(
  {
    id: 'mint-nft-workflow',
    retries: 3,
  },
  { event: 'mint/initiated' },
  async ({ event, step }: { event: MintInitiatedEvent; step: any }) => {
    const { eligibilityId, playerId, stakeKey, paymentAddress } = event.data;

    console.log('[MintWorkflow] Starting mint workflow', {
      eligibilityId,
      playerId,
      stakeKey,
    });

    // Step 1: Validate eligibility
    const eligibility = await step.run('validate-eligibility', async () => {
      console.log('[MintWorkflow] Validating eligibility:', eligibilityId);
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      try {
        const eligibility = await mintService.validateEligibility(eligibilityId);
        
        // Verify ownership
        if (eligibility.playerId !== playerId) {
          throw new NonRetriableError(
            `Eligibility ${eligibilityId} does not belong to player ${playerId}`
          );
        }

        console.log('[MintWorkflow] Eligibility validated:', {
          id: eligibility.id,
          categoryId: eligibility.categoryId,
          status: eligibility.status,
          expiresAt: eligibility.expiresAt,
        });

        return eligibility;
      } catch (error: any) {
        console.error('[MintWorkflow] Eligibility validation failed:', error);
        
        // Don't retry validation errors (expired, already used, not found)
        if (error.message.includes('expired') || 
            error.message.includes('cannot mint') ||
            error.message.includes('not found')) {
          throw new NonRetriableError(error.message);
        }
        
        throw error;
      }
    });

    // Step 2: Check NFT stock availability
    await step.run('check-stock-availability', async () => {
      console.log('[MintWorkflow] Checking stock availability for category:', eligibility.categoryId);
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      const hasStock = await mintService.checkStockAvailability(eligibility.categoryId!);
      
      if (!hasStock) {
        const availableCount = await mintService.getAvailableNFTCount(eligibility.categoryId!);
        throw new NonRetriableError(
          `No NFTs available for category ${eligibility.categoryId}. Available: ${availableCount}`
        );
      }

      console.log('[MintWorkflow] Stock available for category:', eligibility.categoryId);
      return true;
    });

    // Step 3: Reserve NFT from catalog
    const nft = await step.run('reserve-nft', async () => {
      console.log('[MintWorkflow] Reserving NFT from catalog for category:', eligibility.categoryId);
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      const nft = await mintService.selectAvailableNFT(eligibility.categoryId!);
      
      if (!nft) {
        throw new NonRetriableError(
          `Failed to reserve NFT for category ${eligibility.categoryId}`
        );
      }

      console.log('[MintWorkflow] NFT reserved:', {
        id: nft.id,
        name: nft.name,
        categoryId: nft.categoryId,
      });

      return nft;
    });

    // Step 4: Create mint operation record
    const mintOperation = await step.run('create-mint-operation', async () => {
      console.log('[MintWorkflow] Creating mint operation record');
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      const policyId = process.env.NFT_POLICY_ID || '';
      if (!policyId) {
        throw new NonRetriableError('NFT_POLICY_ID environment variable is not set');
      }

      const mintOperation = await mintService.createMintOperation(
        eligibilityId,
        nft.id,
        playerId,
        stakeKey,
        policyId
      );

      console.log('[MintWorkflow] Mint operation created:', {
        id: mintOperation.id,
        status: mintOperation.status,
      });

      return mintOperation;
    });

    // Step 5: Submit blockchain transaction
    const transaction = await step.run('submit-blockchain-transaction', async () => {
      console.log('[MintWorkflow] Submitting blockchain transaction');
      
      const cardanoService = new CardanoService();

      try {
        // Build metadata from NFT catalog
        const metadata = {
          name: nft.name,
          image: `ipfs://${nft.ipfsCid}`, // IPFS URL for the image
          description: nft.description || `${nft.name} - TriviaNFT Category NFT`,
          attributes: nft.attributes ? Object.entries(nft.attributes).map(([trait_type, value]) => ({
            trait_type,
            value: String(value),
          })) : [],
        };

        const result = await cardanoService.mintNFT({
          recipientAddress: paymentAddress,
          policyId: process.env.NFT_POLICY_ID || '',
          assetName: nft.name,
          metadata,
        });

        console.log('[MintWorkflow] Transaction submitted:', {
          txHash: result.txHash,
          policyId: result.policyId,
          assetFingerprint: result.assetFingerprint,
        });

        // Update mint operation with transaction hash
        const pool = await getPool();
        const mintService = new MintService(pool);
        await mintService.updateMintStatus(
          mintOperation.id,
          MintStatus.PENDING,
          result.txHash
        );

        return result;
      } catch (error: any) {
        console.error('[MintWorkflow] Blockchain transaction failed:', error);
        
        // Update mint operation with error
        const pool = await getPool();
        const mintService = new MintService(pool);
        await mintService.updateMintStatus(
          mintOperation.id,
          MintStatus.FAILED,
          undefined,
          error.message
        );

        // Don't retry blockchain errors (insufficient funds, invalid address, etc.)
        if (error.message.includes('Insufficient funds') ||
            error.message.includes('Invalid') ||
            error.message.includes('address')) {
          throw new NonRetriableError(error.message);
        }

        throw error;
      }
    });

    // Step 6: Wait for blockchain confirmation (2 minutes)
    await step.sleep('wait-for-confirmation', '2m');

    // Step 7: Check transaction confirmation status
    const isConfirmed = await step.run('check-confirmation', async () => {
      console.log('[MintWorkflow] Checking transaction confirmation:', transaction.txHash);
      
      // For now, we'll assume the transaction is confirmed after the sleep
      // In production, you would query Blockfrost to check the transaction status
      // TODO: Implement actual confirmation check via Blockfrost API
      
      console.log('[MintWorkflow] Transaction confirmed (assumed)');
      return true;
    });

    // Step 8: Update mint operation status to confirmed
    await step.run('update-mint-status', async () => {
      console.log('[MintWorkflow] Updating mint operation status to confirmed');
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      await mintService.updateMintStatus(
        mintOperation.id,
        MintStatus.CONFIRMED,
        transaction.txHash
      );

      console.log('[MintWorkflow] Mint operation status updated to confirmed');
    });

    // Step 9: Mark eligibility as used
    await step.run('mark-eligibility-used', async () => {
      console.log('[MintWorkflow] Marking eligibility as used');
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      await mintService.markEligibilityUsed(eligibilityId);

      console.log('[MintWorkflow] Eligibility marked as used');
    });

    // Step 10: Create player_nfts record
    await step.run('create-player-nft', async () => {
      console.log('[MintWorkflow] Creating player NFT record');
      
      const pool = await getPool();
      const mintService = new MintService(pool);

      // Build metadata for player_nfts table
      const metadata = {
        name: nft.name,
        image: `ipfs://${nft.ipfsCid}`,
        description: nft.description || `${nft.name} - TriviaNFT Category NFT`,
        attributes: nft.attributes ? Object.entries(nft.attributes).map(([trait_type, value]) => ({
          trait_type,
          value: String(value),
        })) : [],
      };

      await mintService.createPlayerNFT(
        stakeKey,
        transaction.policyId,
        transaction.assetFingerprint,
        transaction.tokenName,
        eligibility.categoryId!,
        metadata,
        'category', // type_code
        mintOperation.id
      );

      console.log('[MintWorkflow] Player NFT record created');
    });

    console.log('[MintWorkflow] Mint workflow completed successfully', {
      eligibilityId,
      mintOperationId: mintOperation.id,
      txHash: transaction.txHash,
    });

    return {
      success: true,
      mintOperationId: mintOperation.id,
      txHash: transaction.txHash,
      assetFingerprint: transaction.assetFingerprint,
    };
  }
);
