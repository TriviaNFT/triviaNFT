/**
 * Step Function: Upload to IPFS
 * Fetch from S3, pin to IPFS, store CID
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getPool } from '../../../db/connection';
import { MintService } from '../../../services/mint-service';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

interface UploadToIPFSInput {
  mintId: string;
  eligibilityId: string;
  playerId: string;
  stakeKey: string;
  categoryId: string;
  policyId: string;
  catalogId: string;
  nftName: string;
  s3ArtKey: string;
  s3MetaKey: string;
  attributes: any;
}

interface UploadToIPFSOutput extends UploadToIPFSInput {
  ipfsCid: string;
  ipfsUrl: string;
}

interface IPFSResult {
  ipfs_hash: string;
  name: string;
  size: string;
}

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

  const blockfrostUrl = process.env.BLOCKFROST_URL || 'https://cardano-mainnet.blockfrost.io/api/v0';

  try {
    // Fetch metadata from S3
    const metaCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: input.s3MetaKey,
    });

    const metaResponse = await s3Client.send(metaCommand);
    const metadataStr = await metaResponse.Body?.transformToString();
    
    if (!metadataStr) {
      throw new Error('Failed to read metadata from S3');
    }

    const metadata = JSON.parse(metadataStr);

    // Update metadata with IPFS image URL (will be set after art upload)
    // For now, we'll use a placeholder and update it later
    const updatedMetadata = {
      ...metadata,
      name: input.nftName,
      attributes: input.attributes,
    };

    // Pin metadata to IPFS via Blockfrost
    const response = await fetch(`${blockfrostUrl}/ipfs/add`, {
      method: 'POST',
      headers: {
        'project_id': blockfrostApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedMetadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Blockfrost IPFS upload failed: ${response.status} ${errorText}`);
    }

    const ipfsResult = await response.json() as IPFSResult;
    
    // Validate the response structure
    if (!ipfsResult || typeof ipfsResult !== 'object') {
      throw new Error('Invalid IPFS response: expected object');
    }
    
    if (!ipfsResult.ipfs_hash || typeof ipfsResult.ipfs_hash !== 'string') {
      throw new Error('Invalid IPFS response: missing or invalid ipfs_hash');
    }
    
    const ipfsCid = ipfsResult.ipfs_hash;

    const ipfsUrl = `ipfs://${ipfsCid}`;

    console.log('Uploaded to IPFS:', { ipfsCid, ipfsUrl });

    // Update catalog with IPFS CID
    const db = await getPool();
    const mintService = new MintService(db);
    await mintService.markCatalogItemMinted(input.catalogId, ipfsCid);

    return {
      ...input,
      ipfsCid,
      ipfsUrl,
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};
