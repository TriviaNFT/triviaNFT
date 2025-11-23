/**
 * Forge Workflow - Inngest Function
 * 
 * Orchestrates the NFT forging process:
 * 1. Validate NFT ownership for all input fingerprints
 * 2. Validate forge requirements (correct number of NFTs, correct categories/tiers)
 * 3. Create forge operation record in database
 * 4. Submit burn transaction for input NFTs
 * 5. Wait for burn confirmation (2 minutes)
 * 6. Check burn transaction status
 * 7. Submit mint transaction for output NFT
 * 8. Wait for mint confirmation (2 minutes)
 * 9. Check mint transaction status
 * 10. Update forge operation status to confirmed
 * 11. Update player_nfts records (mark inputs as burned, add output)
 * 
 * Requirements: 3.2, 6.6, 6.7, 6.8
 */

import { inngest } from '../../src/lib/inngest';
import { getPool } from '../../../../services/api/src/db/connection';
import { ForgeService } from '../../../../services/api/src/services/forge-service';
import { CardanoService } from '../../../../services/api/src/services/cardano-service';
import { ForgeStatus, ForgeType } from '@trivia-nft/shared';
import { NonRetriableError } from 'inngest';

/**
 * Event payload for forge/initiated event
 */
interface ForgeInitiatedEvent {
  name: 'forge/initiated';
  data: {
    forgeType: 'category' | 'master' | 'season';
    stakeKey: string;
    inputFingerprints: string[];
    categoryId?: string;
    seasonId?: string;
    recipientAddress: string;
  };
}

/**
 * Forge workflow function
 * 
 * Triggered by: forge/initiated event
 * Retries: Each step retries independently up to 3 times
 * Timeout: 20 minutes total
 */
export const forgeWorkflow = inngest.createFunction(
  {
    id: 'forge-nft-workflow',
    retries: 3,
  },
  { event: 'forge/initiated' },
  async ({ event, step }: { event: ForgeInitiatedEvent; step: any }) => {
    const { forgeType, stakeKey, inputFingerprints, categoryId, seasonId, recipientAddress } = event.data;

    console.log('[ForgeWorkflow] Starting forge workflow', {
      forgeType,
      stakeKey,
      inputCount: inputFingerprints.length,
      categoryId,
      seasonId,
    });

    // Step 1: Validate NFT ownership for all input fingerprints
    await step.run('validate-nft-ownership', async () => {
      console.log('[ForgeWorkflow] Validating NFT ownership for', inputFingerprints.length, 'NFTs');
      
      const pool = await getPool();
      const forgeService = new ForgeService(pool);

      try {
        const isOwner = await forgeService.validateNFTOwnership(stakeKey, inputFingerprints);
        
        if (!isOwner) {
          throw new NonRetriableError(
            `Player ${stakeKey} does not own all required NFTs`
          );
        }

        console.log('[ForgeWorkflow] NFT ownership validated');
        return true;
      } catch (error: any) {
        console.error('[ForgeWorkflow] NFT ownership validation failed:', error);
        
        // Don't retry ownership validation errors
        if (error.message.includes('does not own')) {
          throw new NonRetriableError(error.message);
        }
        
        throw error;
      }
    });

    // Step 2: Validate forge requirements
    const nfts = await step.run('validate-forge-requirements', async () => {
      console.log('[ForgeWorkflow] Validating forge requirements');
      
      const pool = await getPool();
      const forgeService = new ForgeService(pool);

      try {
        // Get the NFTs by fingerprints
        const nfts = await forgeService.getNFTsByFingerprints(inputFingerprints);
        
        if (nfts.length !== inputFingerprints.length) {
          throw new NonRetriableError(
            `Expected ${inputFingerprints.length} NFTs but found ${nfts.length}`
          );
        }

        // Validate all NFTs are category tier (not already ultimate/master/seasonal)
        const invalidTiers = nfts.filter(nft => nft.tier !== 'category');
        if (invalidTiers.length > 0) {
          throw new NonRetriableError(
            `Cannot forge with non-category NFTs. Found ${invalidTiers.length} NFTs with invalid tiers`
          );
        }

        // Validate forge type specific requirements
        if (forgeType === 'category') {
          // All NFTs must be from the same category
          const categories = new Set(nfts.map(nft => nft.categoryId));
          if (categories.size !== 1) {
            throw new NonRetriableError(
              `Category forge requires all NFTs from same category. Found ${categories.size} different categories`
            );
          }
          
          // Verify categoryId matches
          const nftCategoryId = Array.from(categories)[0];
          if (nftCategoryId !== categoryId) {
            throw new NonRetriableError(
              `Category mismatch: expected ${categoryId} but NFTs are from ${nftCategoryId}`
            );
          }
        } else if (forgeType === 'master') {
          // All NFTs must be from different categories
          const categories = new Set(nfts.map(nft => nft.categoryId));
          if (categories.size !== nfts.length) {
            throw new NonRetriableError(
              `Master forge requires NFTs from different categories. Found ${categories.size} unique categories for ${nfts.length} NFTs`
            );
          }
        } else if (forgeType === 'season') {
          // All NFTs must be from the same season
          const seasons = new Set(nfts.map(nft => nft.seasonId));
          if (seasons.size !== 1) {
            throw new NonRetriableError(
              `Season forge requires all NFTs from same season. Found ${seasons.size} different seasons`
            );
          }
          
          // Verify seasonId matches
          const nftSeasonId = Array.from(seasons)[0];
          if (nftSeasonId !== seasonId) {
            throw new NonRetriableError(
              `Season mismatch: expected ${seasonId} but NFTs are from ${nftSeasonId}`
            );
          }
        }

        console.log('[ForgeWorkflow] Forge requirements validated');
        return nfts;
      } catch (error: any) {
        console.error('[ForgeWorkflow] Forge requirements validation failed:', error);
        
        // Don't retry validation errors
        if (error.message.includes('Expected') || 
            error.message.includes('Cannot forge') ||
            error.message.includes('requires') ||
            error.message.includes('mismatch')) {
          throw new NonRetriableError(error.message);
        }
        
        throw error;
      }
    });

    // Step 3: Create forge operation record
    const forgeOperation = await step.run('create-forge-operation', async () => {
      console.log('[ForgeWorkflow] Creating forge operation record');
      
      const pool = await getPool();
      const forgeService = new ForgeService(pool);

      const forgeOperation = await forgeService.createForgeOperation(
        forgeType,
        stakeKey,
        inputFingerprints,
        categoryId,
        seasonId
      );

      console.log('[ForgeWorkflow] Forge operation created:', {
        id: forgeOperation.id,
        type: forgeOperation.type,
        status: forgeOperation.status,
      });

      return forgeOperation;
    });

    // Step 4: Submit burn transaction for input NFTs
    const burnTransaction = await step.run('submit-burn-transaction', async () => {
      console.log('[ForgeWorkflow] Submitting burn transaction for', inputFingerprints.length, 'NFTs');
      
      const cardanoService = new CardanoService();

      try {
        // Prepare burn assets
        const policyId = process.env.NFT_POLICY_ID || '';
        if (!policyId) {
          throw new NonRetriableError('NFT_POLICY_ID environment variable is not set');
        }

        const burnAssets = nfts.map(nft => ({
          policyId: nft.policyId,
          assetNameHex: Buffer.from(nft.tokenName, 'utf8').toString('hex'),
        }));

        // For now, we'll use a simplified burn approach
        // In production, this would submit an actual burn transaction
        // TODO: Implement actual burn transaction via Blockfrost
        
        const burnTxHash = `burn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        console.log('[ForgeWorkflow] Burn transaction submitted (simulated):', burnTxHash);

        // Update forge operation with burn tx hash
        const pool = await getPool();
        const forgeService = new ForgeService(pool);
        await forgeService.updateForgeStatus(
          forgeOperation.id,
          ForgeStatus.PENDING,
          burnTxHash
        );

        return { txHash: burnTxHash };
      } catch (error: any) {
        console.error('[ForgeWorkflow] Burn transaction failed:', error);
        
        // Update forge operation with error
        const pool = await getPool();
        const forgeService = new ForgeService(pool);
        await forgeService.updateForgeStatus(
          forgeOperation.id,
          ForgeStatus.FAILED,
          undefined,
          undefined,
          undefined,
          error.message
        );

        // Don't retry blockchain errors
        if (error.message.includes('Insufficient funds') ||
            error.message.includes('Invalid') ||
            error.message.includes('address')) {
          throw new NonRetriableError(error.message);
        }

        throw error;
      }
    });

    // Step 5: Wait for burn confirmation (2 minutes)
    await step.sleep('wait-for-burn-confirmation', '2m');

    // Step 6: Check burn transaction confirmation status
    await step.run('check-burn-confirmation', async () => {
      console.log('[ForgeWorkflow] Checking burn transaction confirmation:', burnTransaction.txHash);
      
      // For now, we'll assume the transaction is confirmed after the sleep
      // In production, you would query Blockfrost to check the transaction status
      // TODO: Implement actual confirmation check via Blockfrost API
      
      console.log('[ForgeWorkflow] Burn transaction confirmed (assumed)');
      return true;
    });

    // Step 7: Submit mint transaction for output NFT
    const mintTransaction = await step.run('submit-mint-transaction', async () => {
      console.log('[ForgeWorkflow] Submitting mint transaction for Ultimate NFT');
      
      const cardanoService = new CardanoService();

      try {
        // Determine the tier and name for the output NFT
        let tier: 'ultimate' | 'master' | 'seasonal';
        let assetName: string;
        
        if (forgeType === 'category') {
          tier = 'ultimate';
          assetName = `Ultimate_${categoryId}_${Date.now()}`;
        } else if (forgeType === 'master') {
          tier = 'master';
          assetName = `Master_${Date.now()}`;
        } else {
          tier = 'seasonal';
          assetName = `Seasonal_${seasonId}_${Date.now()}`;
        }

        // Build metadata for the Ultimate NFT
        const metadata = {
          name: assetName,
          image: `ipfs://placeholder_${tier}`, // TODO: Use actual IPFS CID
          description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} NFT forged from ${inputFingerprints.length} category NFTs`,
          attributes: [
            { trait_type: 'Tier', value: tier },
            { trait_type: 'Forge Type', value: forgeType },
            { trait_type: 'Input Count', value: String(inputFingerprints.length) },
          ],
        };

        const result = await cardanoService.mintNFT({
          recipientAddress,
          policyId: process.env.NFT_POLICY_ID || '',
          assetName,
          metadata,
        });

        console.log('[ForgeWorkflow] Mint transaction submitted:', {
          txHash: result.txHash,
          policyId: result.policyId,
          assetFingerprint: result.assetFingerprint,
        });

        // Update forge operation with mint tx hash
        const pool = await getPool();
        const forgeService = new ForgeService(pool);
        await forgeService.updateForgeStatus(
          forgeOperation.id,
          ForgeStatus.PENDING,
          burnTransaction.txHash,
          result.txHash,
          result.assetFingerprint
        );

        return result;
      } catch (error: any) {
        console.error('[ForgeWorkflow] Mint transaction failed:', error);
        
        // Update forge operation with error
        const pool = await getPool();
        const forgeService = new ForgeService(pool);
        await forgeService.updateForgeStatus(
          forgeOperation.id,
          ForgeStatus.FAILED,
          burnTransaction.txHash,
          undefined,
          undefined,
          error.message
        );

        // Don't retry blockchain errors
        if (error.message.includes('Insufficient funds') ||
            error.message.includes('Invalid') ||
            error.message.includes('address')) {
          throw new NonRetriableError(error.message);
        }

        throw error;
      }
    });

    // Step 8: Wait for mint confirmation (2 minutes)
    await step.sleep('wait-for-mint-confirmation', '2m');

    // Step 9: Check mint transaction confirmation status
    await step.run('check-mint-confirmation', async () => {
      console.log('[ForgeWorkflow] Checking mint transaction confirmation:', mintTransaction.txHash);
      
      // For now, we'll assume the transaction is confirmed after the sleep
      // In production, you would query Blockfrost to check the transaction status
      // TODO: Implement actual confirmation check via Blockfrost API
      
      console.log('[ForgeWorkflow] Mint transaction confirmed (assumed)');
      return true;
    });

    // Step 10: Update forge operation status to confirmed
    await step.run('update-forge-status', async () => {
      console.log('[ForgeWorkflow] Updating forge operation status to confirmed');
      
      const pool = await getPool();
      const forgeService = new ForgeService(pool);

      await forgeService.updateForgeStatus(
        forgeOperation.id,
        ForgeStatus.CONFIRMED,
        burnTransaction.txHash,
        mintTransaction.txHash,
        mintTransaction.assetFingerprint
      );

      console.log('[ForgeWorkflow] Forge operation status updated to confirmed');
    });

    // Step 11: Update player_nfts records
    await step.run('update-player-nfts', async () => {
      console.log('[ForgeWorkflow] Updating player NFT records');
      
      const pool = await getPool();
      const forgeService = new ForgeService(pool);

      // Mark input NFTs as burned
      await forgeService.markNFTsBurned(inputFingerprints);
      console.log('[ForgeWorkflow] Input NFTs marked as burned');

      // Determine tier and type code for output NFT
      let tier: 'ultimate' | 'master' | 'seasonal';
      let typeCode: string;
      
      if (forgeType === 'category') {
        tier = 'ultimate';
        typeCode = `ultimate_${categoryId}`;
      } else if (forgeType === 'master') {
        tier = 'master';
        typeCode = 'master';
      } else {
        tier = 'seasonal';
        typeCode = `seasonal_${seasonId}`;
      }

      // Create Ultimate NFT record
      const metadata = {
        name: mintTransaction.tokenName,
        image: `ipfs://placeholder_${tier}`,
        description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} NFT forged from ${inputFingerprints.length} category NFTs`,
        attributes: [
          { trait_type: 'Tier', value: tier },
          { trait_type: 'Forge Type', value: forgeType },
          { trait_type: 'Input Count', value: String(inputFingerprints.length) },
        ],
      };

      await forgeService.createUltimateNFT(
        stakeKey,
        mintTransaction.policyId,
        mintTransaction.assetFingerprint,
        mintTransaction.tokenName,
        tier,
        forgeType === 'category' ? categoryId : undefined,
        forgeType === 'season' ? seasonId : undefined,
        metadata,
        typeCode
      );

      console.log('[ForgeWorkflow] Ultimate NFT record created');
    });

    console.log('[ForgeWorkflow] Forge workflow completed successfully', {
      forgeOperationId: forgeOperation.id,
      burnTxHash: burnTransaction.txHash,
      mintTxHash: mintTransaction.txHash,
      outputAssetFingerprint: mintTransaction.assetFingerprint,
    });

    return {
      success: true,
      forgeOperationId: forgeOperation.id,
      burnTxHash: burnTransaction.txHash,
      mintTxHash: mintTransaction.txHash,
      outputAssetFingerprint: mintTransaction.assetFingerprint,
    };
  }
);
