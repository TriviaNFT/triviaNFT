import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const migrationPath = join(__dirname, 'migrations', '2_make-ended-at-nullable.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('🔄 Running migration: 2_make-ended-at-nullable.sql');
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
