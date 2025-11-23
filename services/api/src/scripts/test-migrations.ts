/**
 * Test script to verify migrations have been run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getPool, closePool } from '../db/connection.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    const pool = await getPool();
    
    console.log('📋 Checking migrations...\n');
    
    // Get recent migrations
    const migrations = await pool.query(`
      SELECT name, run_on 
      FROM pgmigrations 
      ORDER BY run_on DESC 
      LIMIT 10
    `);
    
    console.log(`✅ Found ${migrations.rowCount} recent migrations:\n`);
    migrations.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.name}`);
      console.log(`   Run on: ${row.run_on}\n`);
    });
    
    // Check key tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Found ${tables.rowCount} tables:\n`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

main();
