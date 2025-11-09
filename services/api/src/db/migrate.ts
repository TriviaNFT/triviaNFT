/**
 * Database Migration Runner
 * 
 * This script runs database migrations using node-pg-migrate.
 * It can be executed locally or as part of a Lambda function during deployment.
 * 
 * Usage:
 *   - Local: DATABASE_URL=postgresql://... pnpm migrate:up
 *   - Lambda: Triggered automatically during CDK deployment
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  error?: string;
}

/**
 * Run database migrations
 */
export async function runMigrations(databaseUrl: string): Promise<MigrationResult> {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 1, // Only need one connection for migrations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  const migrationsRun: string[] = [];

  try {
    console.log('Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get list of already run migrations
    const { rows: completedMigrations } = await client.query(
      'SELECT name FROM pgmigrations ORDER BY id'
    );
    const completedSet = new Set(completedMigrations.map((row: { name: string }) => row.name));

    // Read migration files
    const migrationsDir = join(__dirname, '../../migrations');
    const migrationFiles = [
      '1_initial-schema.sql',
      // Add more migration files here as they are created
    ];

    // Run each migration that hasn't been run yet
    for (const filename of migrationFiles) {
      const migrationName = filename.replace('.sql', '');
      
      if (completedSet.has(migrationName)) {
        console.log(`Skipping already completed migration: ${migrationName}`);
        continue;
      }

      console.log(`Running migration: ${migrationName}`);
      
      try {
        // Begin transaction
        await client.query('BEGIN');

        // Read and execute migration SQL
        const migrationPath = join(migrationsDir, filename);
        const migrationSql = readFileSync(migrationPath, 'utf-8');
        
        await client.query(migrationSql);

        // Record migration as completed
        await client.query(
          'INSERT INTO pgmigrations (name) VALUES ($1)',
          [migrationName]
        );

        // Commit transaction
        await client.query('COMMIT');
        
        migrationsRun.push(migrationName);
        console.log(`✓ Completed migration: ${migrationName}`);
      } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migrationName} failed: ${error}`);
      }
    }

    console.log(`Successfully completed ${migrationsRun.length} migration(s)`);
    
    return {
      success: true,
      migrationsRun,
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      migrationsRun,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  runMigrations(databaseUrl)
    .then((result) => {
      if (result.success) {
        console.log('\n✓ All migrations completed successfully');
        process.exit(0);
      } else {
        console.error('\n✗ Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n✗ Unexpected error:', error);
      process.exit(1);
    });
}
