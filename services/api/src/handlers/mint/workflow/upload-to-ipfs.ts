/**
 * Step Function: Upload to IPFS
 * Fetch from S3, pin to IPFS, store CID
 */

import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';

interface UploadToIPFSInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
  categoryName: string;
  policyId: string;
  catalogId: string;
  nftName: string;
  s3ArtKey: string;
  s3MetaKey: string;
  visualDescription?: string;
  attributes: any;
}

interface UploadToIPFSOutput extends UploadToIPFSInput {
  ipfsCid: string;
  ipfsUrl: string;
  videoCid?: string;
  videoUrl?: string;
}

// interface IPFSResult {
//   ipfs_hash: string;
//   name: string;
//   size: string;
// }

export const handler = async (
  input: UploadToIPFSInput
): Promise<UploadToIPFSOutput> => {
  console.log('Uploading to IPFS:', input);

  const bucketName = process.env.NFT_ASSETS_BUCKET;
  if (!bucketName) {
    throw new Error('NFT_ASSETS_BUCKET not configured');
  }

  const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;
  if (!blockfrostApiKey) {
    throw new Error('BLOCKFROST_API_KEY not configured');
  }

  // const blockfrostUrl = process.env.BLOCKFROST_URL || 'https://cardano-mainnet.blockfrost.io/api/v0';

  try {
    // Fetch category IPFS hashes from database (already uploaded)
    const db = await getPool();
    const categoryResult = await db.query(
      `SELECT nft_image_ipfs, nft_video_ipfs FROM categories WHERE id = $1`,
      [input.categoryId]
    );

    const category = categoryResult.rows[0];
    if (!category || !category.nft_image_ipfs) {
      throw new Error('Category IPFS hashes not found');
    }

    const ipfsUrl = category.nft_image_ipfs;
    const videoUrl = category.nft_video_ipfs;
    
    // Extract CID from IPFS URL (ipfs://Qm... -> Qm...)
    const ipfsCid = ipfsUrl.replace('ipfs://', '');
    const videoCid = videoUrl ? videoUrl.replace('ipfs://', '') : undefined;

    console.log('Using category IPFS hashes:', { 
      ipfsCid, 
      ipfsUrl,
      videoCid,
      videoUrl 
    });

    // Update catalog with IPFS CID
    const mintService = new MintService(db);
    await mintService.markCatalogItemMinted(input.catalogId, ipfsCid);

    return {
      ...input,
      ipfsCid,
      ipfsUrl,
      videoCid,
      videoUrl,
    };
  } catch (error) {
    console.error('Error fetching IPFS hashes:', error);
    throw error;
  }
};
