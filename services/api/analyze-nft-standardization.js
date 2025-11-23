import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Helper function to convert display name to kebab-case
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function analyzeStandardization() {
  try {
    console.log('🔍 NFT Naming Standardization Analysis\n');
    console.log('='.repeat(80));
    
    // Get all NFTs that need standardization
    const result = await pool.query(`
      SELECT 
        c.slug as category,
        n.id,
        n.name,
        n.s3_art_key,
        n.s3_meta_key,
        n.tier,
        n.is_minted,
        CASE 
          WHEN n.s3_art_key LIKE '%seed-data%' THEN 'seed-data'
          WHEN n.s3_art_key LIKE '%ultimate%' THEN 'ultimate'
          WHEN n.s3_art_key LIKE '%' || c.slug || '-%' OR n.s3_art_key LIKE '%' || c.slug || '-&-%' THEN 'numbered'
          ELSE 'kebab-case'
        END as current_pattern
      FROM nft_catalog n 
      JOIN categories c ON n.category_id = c.id 
      ORDER BY c.display_order, n.created_at
    `);

    const nfts = result.rows;
    
    // Categorize NFTs
    const needsChange = [];
    const alreadyGood = [];
    const seedDataToRemove = [];
    
    for (const nft of nfts) {
      const kebabName = toKebabCase(nft.name);
      
      if (nft.current_pattern === 'seed-data') {
        seedDataToRemove.push(nft);
      } else if (nft.current_pattern === 'ultimate') {
        // Ultimate NFTs have their own format, check if correct
        const expectedPath = `nft-art/ultimate/${nft.category}/${nft.category}-ultimate-`;
        if (!nft.s3_art_key.startsWith(expectedPath)) {
          needsChange.push({
            ...nft,
            reason: 'Ultimate NFT path incorrect',
            proposed_art_key: nft.s3_art_key, // Keep as is for now
            proposed_meta_key: nft.s3_meta_key
          });
        } else {
          alreadyGood.push(nft);
        }
      } else if (nft.current_pattern === 'numbered') {
        // Convert numbered to kebab-case
        const proposedArtKey = `nft-art/${nft.category}/${kebabName}.png`;
        const proposedMetaKey = `nft-metadata/${nft.category}/${kebabName}.json`;
        
        needsChange.push({
          ...nft,
          reason: 'Numbered format → Kebab-case',
          proposed_art_key: proposedArtKey,
          proposed_meta_key: proposedMetaKey
        });
      } else {
        // Already kebab-case, verify it's correct
        const expectedArtKey = `nft-art/${nft.category}/${kebabName}.png`;
        if (nft.s3_art_key === expectedArtKey) {
          alreadyGood.push(nft);
        } else {
          needsChange.push({
            ...nft,
            reason: 'Kebab-case needs correction',
            proposed_art_key: expectedArtKey,
            proposed_meta_key: `nft-metadata/${nft.category}/${kebabName}.json`
          });
        }
      }
    }

    // Print Summary
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total NFTs in database: ${nfts.length}`);
    console.log(`✅ Already standardized: ${alreadyGood.length}`);
    console.log(`🔄 Need standardization: ${needsChange.length}`);
    console.log(`🗑️  Seed data to remove: ${seedDataToRemove.length}`);
    
    // Breakdown by category
    console.log('\n📁 BY CATEGORY');
    console.log('='.repeat(80));
    const categories = [...new Set(nfts.map(n => n.category))];
    for (const cat of categories) {
      const total = nfts.filter(n => n.category === cat).length;
      const good = alreadyGood.filter(n => n.category === cat).length;
      const change = needsChange.filter(n => n.category === cat).length;
      const seed = seedDataToRemove.filter(n => n.category === cat).length;
      console.log(`${cat.padEnd(20)} Total: ${total.toString().padStart(3)} | Good: ${good.toString().padStart(3)} | Change: ${change.toString().padStart(3)} | Remove: ${seed}`);
    }

    // Print items to remove
    if (seedDataToRemove.length > 0) {
      console.log('\n🗑️  SEED DATA TO REMOVE');
      console.log('='.repeat(80));
      for (const nft of seedDataToRemove) {
        console.log(`[${nft.category}] ${nft.name}`);
        console.log(`  Current: ${nft.s3_art_key}`);
        console.log(`  Action: DELETE (legacy seed data)`);
        console.log(`  Minted: ${nft.is_minted ? '⚠️  YES - Cannot delete!' : 'No'}`);
        console.log('');
      }
    }

    // Print changes needed (first 20 examples)
    if (needsChange.length > 0) {
      console.log('\n🔄 CHANGES NEEDED (First 20 examples)');
      console.log('='.repeat(80));
      for (const nft of needsChange.slice(0, 20)) {
        console.log(`[${nft.category}] ${nft.name}`);
        console.log(`  Reason: ${nft.reason}`);
        console.log(`  Current Art:  ${nft.s3_art_key}`);
        console.log(`  Proposed Art: ${nft.proposed_art_key}`);
        if (nft.s3_art_key !== nft.proposed_art_key) {
          console.log(`  ⚠️  File rename required in S3!`);
        }
        console.log(`  Minted: ${nft.is_minted ? '⚠️  YES' : 'No'}`);
        console.log('');
      }
      
      if (needsChange.length > 20) {
        console.log(`... and ${needsChange.length - 20} more changes\n`);
      }
    }

    // Impact Analysis
    console.log('\n⚠️  IMPACT ANALYSIS');
    console.log('='.repeat(80));
    const mintedChanges = needsChange.filter(n => n.is_minted);
    const unmintedChanges = needsChange.filter(n => !n.is_minted);
    
    console.log(`Unminted NFTs (safe to change): ${unmintedChanges.length}`);
    console.log(`Minted NFTs (⚠️  RISKY): ${mintedChanges.length}`);
    console.log('');
    console.log('⚠️  WARNING: Changing minted NFTs requires:');
    console.log('   1. Renaming files in S3 bucket');
    console.log('   2. Updating IPFS metadata (if already pinned)');
    console.log('   3. Potential blockchain metadata updates');
    console.log('   4. Testing to ensure no broken links');
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('1. IMMEDIATE: Remove seed-data entries (if not minted)');
    console.log('2. SAFE: Standardize all unminted NFTs');
    console.log('3. CAREFUL: Plan migration for minted NFTs');
    console.log('4. FUTURE: Enforce naming convention in upload scripts');
    console.log('');
    console.log('Proposed Standard:');
    console.log('  Category NFTs: nft-art/{category}/{descriptive-name}.png');
    console.log('  Ultimate NFTs: nft-art/ultimate/{category}/{category}-ultimate-{n}.png');
    console.log('  Master NFTs:   nft-art/ultimate/{category}-master.png');
    console.log('  Seasonal NFTs: nft-art/ultimate/{category}-seasonal.png');

    // Generate SQL for safe changes (unminted only)
    console.log('\n📝 SAFE MIGRATION SQL (Unminted NFTs only)');
    console.log('='.repeat(80));
    console.log('-- This SQL only updates unminted NFTs\n');
    
    for (const nft of unmintedChanges.slice(0, 10)) {
      console.log(`-- [${nft.category}] ${nft.name}`);
      console.log(`UPDATE nft_catalog SET`);
      console.log(`  s3_art_key = '${nft.proposed_art_key}',`);
      console.log(`  s3_meta_key = '${nft.proposed_meta_key}'`);
      console.log(`WHERE id = '${nft.id}';`);
      console.log('');
    }
    
    if (unmintedChanges.length > 10) {
      console.log(`-- ... and ${unmintedChanges.length - 10} more UPDATE statements\n`);
    }

    // Delete seed data
    const unmintedSeedData = seedDataToRemove.filter(n => !n.is_minted);
    if (unmintedSeedData.length > 0) {
      console.log('-- Remove legacy seed data entries');
      for (const nft of unmintedSeedData) {
        console.log(`DELETE FROM nft_catalog WHERE id = '${nft.id}'; -- ${nft.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeStandardization();
