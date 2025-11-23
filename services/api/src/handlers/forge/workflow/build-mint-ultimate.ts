/**
 * Build Mint Ultimate Lambda
 * Creates a transaction to mint the Ultimate NFT
 */

import { 
  buildAssetName, 
  generateHexId, 
  getCategoryCode,
  getSeasonCode,
  type CategorySlug,
  type TierType,
  createLogger,
  setNamingLogger,
  setCategoryCodeLogger,
  setSeasonCodeLogger
} from '@trivia-nft/shared';

interface BuildMintUltimateInput {
  forgeId: string;
  type: 'category' | 'master' | 'season';
  stakeKey: string;
  categoryId?: string;
  seasonId?: string;
  burnTxHash: string;
  burnConfirmed: boolean;
}

interface BuildMintUltimateOutput extends BuildMintUltimateInput {
  mintTxCbor: string;
  ultimateMetadata: any;
  assetName: string;
  displayName: string;
  typeCode: string;
}

export const handler = async (
  event: BuildMintUltimateInput
): Promise<BuildMintUltimateOutput> => {
  const { type, categoryId, seasonId } = event;

  // Initialize logger with forge context
  const logger = createLogger(undefined, { 
    forgeId: event.forgeId,
    forgeType: type,
    operation: 'build_mint_ultimate'
  });

  // Set logger for naming utilities
  setNamingLogger(logger);
  setCategoryCodeLogger(logger);
  setSeasonCodeLogger(logger);

  logger.info('Building mint transaction for Ultimate NFT', { 
    type, 
    categoryId, 
    seasonId 
  });

  try {
    // Generate hex ID for uniqueness
    const hexId = generateHexId();
    
    // Generate Ultimate NFT metadata and asset name
    let displayName: string;
    let description: string;
    let tier: string;
    let assetName: string;
    let typeCode: string;
    let tierType: TierType;
    let categoryCode: import('@trivia-nft/shared').CategoryCode | undefined;
    let seasonCode: import('@trivia-nft/shared').SeasonCode | undefined;

    switch (type) {
      case 'category':
        // Category Ultimate NFT
        if (!categoryId) {
          throw new Error('Category ID is required for category forge');
        }
        
        categoryCode = getCategoryCode(categoryId as CategorySlug);
        tierType = 'category_ultimate';
        typeCode = 'ULT';
        
        assetName = buildAssetName({
          tier: tierType,
          categoryCode,
          id: hexId,
        });
        
        displayName = `${categoryId} Category Ultimate`;
        description = `Forged from 10 ${categoryId} NFTs, representing mastery of ${categoryId} knowledge`;
        tier = 'ultimate';
        break;
        
      case 'master':
        // Master Ultimate NFT
        tierType = 'master_ultimate';
        typeCode = 'MAST';
        
        assetName = buildAssetName({
          tier: tierType,
          id: hexId,
        });
        
        displayName = 'Master Ultimate';
        description = 'Forged from NFTs across 10 different categories, representing complete mastery';
        tier = 'master';
        break;
        
      case 'season':
        // Seasonal Ultimate NFT
        if (!seasonId) {
          throw new Error('Season ID is required for season forge');
        }
        
        // Parse season ID to extract season type and number
        // Expected format: "winter-1", "spring-1", etc. or database ID
        // For now, we'll use a simple mapping. In production, this should query the database.
        // TODO: Query database to get season info from seasonId
        const seasonMatch = seasonId.match(/^(winter|spring|summer|fall)-(\d+)$/i);
        if (seasonMatch) {
          const [, season, number] = seasonMatch;
          seasonCode = getSeasonCode(season.toLowerCase() as any, parseInt(number, 10));
        } else {
          // Fallback: assume it's already a season code or use default
          // In production, query the database for season info
          seasonCode = 'WI1'; // Default fallback
          console.warn(`Could not parse season ID: ${seasonId}, using default: ${seasonCode}`);
        }
        
        tierType = 'seasonal_ultimate';
        typeCode = 'SEAS';
        
        assetName = buildAssetName({
          tier: tierType,
          seasonCode,
          id: hexId,
        });
        
        // Format display name based on season code
        const seasonInfo = {
          'WI': 'Winter',
          'SP': 'Spring',
          'SU': 'Summer',
          'FA': 'Fall'
        };
        const seasonPrefix = seasonCode.substring(0, 2);
        const seasonNumber = seasonCode.substring(2);
        const seasonName = seasonInfo[seasonPrefix as keyof typeof seasonInfo] || 'Season';
        
        displayName = `${seasonName} Season ${seasonNumber} Ultimate`;
        description = `Forged from seasonal NFTs during ${seasonName} Season ${seasonNumber}`;
        tier = 'seasonal';
        break;
    }

    // Build CIP-25 metadata with both asset_name and display_name
    const ultimateMetadata = {
      name: displayName,
      asset_name: assetName,
      description,
      image: 'ipfs://placeholder', // Will be updated with actual IPFS CID
      attributes: [
        { trait_type: 'Tier', value: tier },
        { trait_type: 'TierCode', value: typeCode },
        { trait_type: 'Type', value: type },
        { trait_type: 'AssetName', value: assetName },
        { trait_type: 'DisplayName', value: displayName },
        { trait_type: 'Forged At', value: new Date().toISOString() },
      ],
    };

    // Add category-specific attributes
    if (categoryCode && categoryId) {
      ultimateMetadata.attributes.push(
        { trait_type: 'Category', value: categoryId },
        { trait_type: 'CategoryCode', value: categoryCode }
      );
    }

    // Add season-specific attributes
    if (seasonCode && seasonId) {
      ultimateMetadata.attributes.push(
        { trait_type: 'Season', value: seasonId },
        { trait_type: 'SeasonCode', value: seasonCode }
      );
    }

    // Build mint transaction using Lucid
    // TODO: Implement actual transaction building
    // const lucid = await Lucid.new(
    //   new Blockfrost(blockfrostUrl, blockfrostApiKey),
    //   'Mainnet'
    // );
    
    // const policyId = process.env.POLICY_ID;
    
    // const tx = await lucid
    //   .newTx()
    //   .mintAssets({
    //     [policyId + assetName]: 1n
    //   })
    //   .attachMetadata(721, {
    //     [policyId]: {
    //       [assetName]: ultimateMetadata
    //     }
    //   })
    //   .complete();
    
    // const mintTxCbor = tx.toString();

    const mintTxCbor = 'placeholder_mint_tx_cbor';

    logger.info('Successfully built mint transaction', { 
      assetName, 
      displayName, 
      typeCode,
      metadataSize: JSON.stringify(ultimateMetadata).length 
    });

    return {
      ...event,
      mintTxCbor,
      ultimateMetadata,
      assetName,
      displayName,
      typeCode,
    };
  } catch (error) {
    logger.error('Build mint ultimate transaction error', error instanceof Error ? error : undefined, { 
      type, 
      categoryId, 
      seasonId,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
