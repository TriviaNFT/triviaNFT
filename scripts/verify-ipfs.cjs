const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL 
});

async function verify() {
  try {
    const result = await pool.query(`
      SELECT 
        name, 
        nft_image_ipfs IS NOT NULL as has_image, 
        nft_video_ipfs IS NOT NULL as has_video 
      FROM categories 
      ORDER BY name
    `);

    console.log('\n✅ Database IPFS Status:\n');
    console.log('Category             | Image | Video');
    console.log('---------------------|-------|------');
    
    result.rows.forEach(row => {
      const name = row.name.padEnd(20);
      const image = row.has_image ? '  ✓  ' : '  ✗  ';
      const video = row.has_video ? '  ✓  ' : '  ✗  ';
      console.log(`${name} | ${image} | ${video}`);
    });

    const allHaveImages = result.rows.every(r => r.has_image);
    const allHaveVideos = result.rows.every(r => r.has_video);

    console.log('\n' + '='.repeat(50));
    if (allHaveImages && allHaveVideos) {
      console.log('✅ SUCCESS: All categories have IPFS hashes!');
    } else {
      console.log('⚠️  WARNING: Some categories missing IPFS hashes');
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
