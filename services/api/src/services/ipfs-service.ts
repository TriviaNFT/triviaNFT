/**
 * IPFS Service for uploading NFT images and metadata
 * Uses Blockfrost IPFS API
 */

import { BlockFrostIPFS } from '@blockfrost/blockfrost-js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class IPFSService {
  private blockfrost: BlockFrostIPFS;

  constructor(projectId: string) {
    // Use BlockFrostIPFS for IPFS operations
    this.blockfrost = new BlockFrostIPFS({
      projectId,
    });
  }

  /**
   * Upload a file (image, JSON, etc.) to IPFS
   * @param content - Buffer or string content
   * @returns IPFS URI (ipfs://Qm...)
   */
  async upload(content: Buffer | string): Promise<string> {
    const tempFile = join(tmpdir(), `ipfs-upload-${Date.now()}.tmp`);
    
    try {
      const buffer = Buffer.isBuffer(content) 
        ? content 
        : Buffer.from(content);

      // Write to temp file (Blockfrost requires file path)
      writeFileSync(tempFile, buffer);
      
      const result = await this.blockfrost.add(tempFile);
      
      console.log('[IPFS] Uploaded successfully:', result.ipfs_hash);
      
      return `ipfs://${result.ipfs_hash}`;
    } catch (error) {
      console.error('[IPFS] Upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Upload NFT metadata JSON to IPFS
   */
  async uploadMetadata(metadata: {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  }): Promise<string> {
    const json = JSON.stringify(metadata, null, 2);
    return this.upload(json);
  }

  /**
   * Upload an image file to IPFS
   */
  async uploadImage(imageBuffer: Buffer): Promise<string> {
    return this.upload(imageBuffer);
  }

  /**
   * Pin an existing IPFS hash (keep it available)
   */
  async pin(ipfsHash: string): Promise<void> {
    try {
      await this.blockfrost.pin(ipfsHash);
      console.log('[IPFS] Pinned:', ipfsHash);
    } catch (error) {
      console.error('[IPFS] Pin failed:', error);
      throw new Error(`Failed to pin IPFS hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
