const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

pool.query('SELECT name, slug, display_order FROM categories ORDER BY display_order')
  .then(res => {
    console.log('\n📊 Your Categories:\n');
    res.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.name.padEnd(25)} → slug: ${row.slug}`);
    });
    console.log(`\nTotal: ${res.rows.length} categories\n`);
    pool.end();
  })
  .catch(err => {
    console.error('Error:', err);
    pool.end();
  });
