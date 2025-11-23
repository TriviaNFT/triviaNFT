import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL
});

async function clearAddresses() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Show current addresses
    const before = await client.query('SELECT id, stake_key, payment_address FROM players');
    console.log('\nBefore:');
    console.log(JSON.stringify(before.rows, null, 2));
    
    // Clear hex addresses (they start with '00' and are long hex strings)
    const result = await client.query(
      `UPDATE players 
       SET payment_address = NULL 
       WHERE payment_address IS NOT NULL 
       AND payment_address NOT LIKE 'addr%'
       RETURNING id, stake_key, payment_address`
    );
    
    console.log(`\nCleared ${result.rowCount} hex addresses`);
    
    // Show after
    const after = await client.query('SELECT id, stake_key, payment_address FROM players');
    console.log('\nAfter:');
    console.log(JSON.stringify(after.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

clearAddresses();
