/**
 * One-time script to upload NFT category images to IPFS
 * Run with: pnpm --filter @trivia-nft/api tsx src/scripts/upload-nft-images-fixed.ts
 */

import { IPFSService } from '../services/ipfs-service.js';
import { getPool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadCategoryImages() {
  const ipfsProjectId = process.env.BLOCKFROST_IPFS_PROJECT_ID;
  
  if (!ipfsProjectId) {
    throw new Error('BLOCKFROST_IPFS_PROJECT_ID environment variable is required');
  }

  const ipfsService = new IPFSService(ipfsProjectId);
  const pool = await getPool();

  console.log('🚀 Starting NFT media upload to IPFS...\n');

  // Get all categories from database
  const result = await pool.query(
    'SELECT id, name, slug FROM categories ORDER BY name'
  );

  const categories = result.rows;
  let totalUploaded = 0;
  let totalSkipped = 0;

  for (const category of categories) {
    try {
      console.log(`📁 Processing ${category.name}...`);

      const slug = category.slug;
      const assetsDir = path.join(__dirname, '../assets/nft-images');
      
      // Paths for thumbnail and video
      const thumbnailPath = path.join(assetsDir, `${slug}-thumbnail.png`);
      const videoPath = path.join(assetsDir, `${slug}-video.mp4`);

      let imageIpfs = null;
      let videoIpfs = null;

      // Upload thumbnail
      if (fs.existsSync(thumbnailPath)) {
        console.log(`   📤 Uploading thumbnail...`);
        const imageBuffer = fs.readFileSync(thumbnailPath);
        imageIpfs = await ipfsService.uploadImage(imageBuffer);
        console.log(`   ✅ Thumbnail: ${imageIpfs}`);
        totalUploaded++;
      } else {
        console.log(`   ⚠️  Thumbnail not found: ${slug}-thumbnail.png`);
      }

      // Upload video
      if (fs.existsSync(videoPath)) {
        console.log(`   📤 Uploading video...`);
        const videoBuffer = fs.readFileSync(videoPath);
        videoIpfs = await ipfsService.uploadImage(videoBuffer);
        console.log(`   ✅ Video: ${videoIpfs}`);
        totalUploaded++;
      } else {
        console.log(`   ⚠️  Video not found: ${slug}-video.mp4`);
      }

      // Update database with IPFS hashes
      if (imageIpfs || videoIpfs) {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (imageIpfs) {
          updates.push(`nft_image_ipfs = $${paramCount++}`);
          values.push(imageIpfs);
        }
        if (videoIpfs) {
          updates.push(`nft_video_ipfs = $${paramCount++}`);
          values.push(videoIpfs);
        }
        values.push(category.id);

        const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount}`;
        console.log(`   🔍 Query: ${query}`);
        console.log(`   📊 Values:`, values);
        
        await pool.query(query, values);
        console.log(`   💾 Database updated\n`);
      } else {
        console.log(`   ⏭️  No files found, skipping\n`);
        totalSkipped++;
      }

    } catch (error) {
      console.error(`   ❌ Error uploading ${category.name}:`, error);
      console.log('');
      totalSkipped++;
    }
  }

  console.log('✨ Upload complete!');
  console.log(`   📤 Total files uploaded: ${totalUploaded}`);
  console.log(`   ⏭️  Total categories skipped: ${totalSkipped}\n`);
  
  process.exit(0);
}

// Run the script
uploadCategoryImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
