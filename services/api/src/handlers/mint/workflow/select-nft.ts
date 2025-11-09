/**
 * Step Function: Select NFT
 * Query nft_catalog for available NFT
 */

import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';

interface SelectNFTInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
  policyId: string;
  eligibilityValidated: boolean;
}

interface SelectNFTOutput extends SelectNFTInput {
  catalogId: string;
  nftName: string;
  s3ArtKey: string;
  s3MetaKey: string;
  attributes: any;
}

export const handler = async (
  input: SelectNFTInput
): Promise<SelectNFTOutput> => {
  console.log('Selecting NFT from catalog:', input);

  const db = await getPool();
  const mintService = new MintService(db);

  try {
    // Select available NFT
    const nft = await mintService.selectAvailableNFT(input.categoryId);

    if (!nft) {
      throw new Error('No available NFTs in catalog for this category');
    }

    console.log('Selected NFT:', { catalogId: nft.id, name: nft.name });

    // Update mint operation with catalog ID
    await db.query(
      'UPDATE mints SET catalog_id = $1 WHERE id = $2',
      [nft.id, input.mintId]
    );

    return {
      ...input,
      catalogId: nft.id,
      nftName: nft.name,
      s3ArtKey: nft.s3ArtKey,
      s3MetaKey: nft.s3MetaKey,
      attributes: nft.attributes || {},
    };
  } catch (error) {
    console.error('Error selecting NFT:', error);
    throw error;
  }
};
