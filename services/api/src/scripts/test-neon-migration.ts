/**
 * Test script to verify database migration on Neon
 * 
 * This script:
 * 1. Connects to Neon database
 * 2. Runs all migration files
 * 3. Verifies tables, indexes, and constraints
 * 4. Verifies triggers and functions
 * 5. Compares schema with expected structure
 * 
 * Requirements: 1.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TableInfo {
  tableName: string;
  columnCount: number;
  columns: string[];
}

interface IndexInfo {
  indexName: string;
  tableName: string;
  indexDef: string;
}

interface ConstraintInfo {
  constraintName: string;
  tableName: string;
  constraintType: string;
}

interface TriggerInfo {
  triggerName: string;
  tableName: string;
  eventManipulation: string;
}

interface FunctionInfo {
  functionName: string;
  returnType: string;
}

class NeonMigrationTester {
  private pool: Pool;
  private results: {
    success: boolean;
    errors: string[];
    warnings: string[];
    tables: TableInfo[];
    indexes: IndexInfo[];
    constraints: ConstraintInfo[];
    triggers: TriggerInfo[];
    functions: FunctionInfo[];
  };

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    this.results = {
      success: true,
      errors: [],
      warnings: [],
      tables: [],
      indexes: [],
      constraints: [],
      triggers: [],
      functions: [],
    };
  }

  async testConnection(): Promise<boolean> {
    console.log('🔌 Testing database connection...');
    try {
      const result = await this.pool.query('SELECT NOW() as current_time, version() as pg_version');
      console.log(`✅ Connected to PostgreSQL`);
      console.log(`   Time: ${result.rows[0].current_time}`);
      console.log(`   Version: ${result.rows[0].pg_version.split(',')[0]}`);
      return true;
    } catch (error) {
      this.results.errors.push(`Connection failed: ${error.message}`);
      console.error(`❌ Connection failed: ${error.message}`);
      return false;
    }
  }

  async runMigrations(): Promise<boolean> {
    console.log('\n📦 Running migrations...');
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    try {
      // Get all SQL migration files
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      console.log(`   Found ${files.length} SQL migration files`);

      for (const file of files) {
        console.log(`   Running: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          await this.pool.query(sql);
          console.log(`   ✅ ${file} completed`);
        } catch (error) {
          // Check if error is due to already existing objects
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  ${file} - objects already exist (skipping)`);
            this.results.warnings.push(`${file}: ${error.message}`);
          } else {
            this.results.errors.push(`${file}: ${error.message}`);
            console.error(`   ❌ ${file} failed: ${error.message}`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Migration execution failed: ${error.message}`);
      console.error(`❌ Migration execution failed: ${error.message}`);
      return false;
    }
  }

  async verifyTables(): Promise<boolean> {
    console.log('\n📋 Verifying tables...');
    
    const expectedTables = [
      'players',
      'categories',
      'questions',
      'question_flags',
      'sessions',
      'seasons',
      'eligibilities',
      'nft_catalog',
      'mints',
      'player_nfts',
      'forge_operations',
      'season_points',
      'leaderboard_snapshots',
    ];

    try {
      const result = await this.pool.query(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = t.table_name) as column_count,
          (SELECT array_agg(column_name ORDER BY ordinal_position)
           FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = t.table_name) as columns
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      this.results.tables = result.rows.map(row => ({
        tableName: row.table_name,
        columnCount: parseInt(row.column_count),
        columns: row.columns || [],
      }));

      console.log(`   Found ${this.results.tables.length} tables`);

      // Check for expected tables
      const foundTables = this.results.tables.map(t => t.tableName);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));
      const extraTables = foundTables.filter(t => !expectedTables.includes(t));

      if (missingTables.length > 0) {
        this.results.errors.push(`Missing tables: ${missingTables.join(', ')}`);
        console.error(`   ❌ Missing tables: ${missingTables.join(', ')}`);
        return false;
      }

      if (extraTables.length > 0) {
        this.results.warnings.push(`Extra tables found: ${extraTables.join(', ')}`);
        console.log(`   ⚠️  Extra tables: ${extraTables.join(', ')}`);
      }

      // Display table details
      for (const table of this.results.tables) {
        console.log(`   ✅ ${table.tableName} (${table.columnCount} columns)`);
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Table verification failed: ${error.message}`);
      console.error(`❌ Table verification failed: ${error.message}`);
      return false;
    }
  }

  async verifyIndexes(): Promise<boolean> {
    console.log('\n🔍 Verifying indexes...');

    try {
      const result = await this.pool.query(`
        SELECT 
          i.indexname as index_name,
          i.tablename as table_name,
          pg_get_indexdef(idx.indexrelid) as index_def
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.indexname
        JOIN pg_index idx ON idx.indexrelid = c.oid
        WHERE i.schemaname = 'public'
          AND i.indexname NOT LIKE '%_pkey'
        ORDER BY i.tablename, i.indexname
      `);

      this.results.indexes = result.rows.map(row => ({
        indexName: row.index_name,
        tableName: row.table_name,
        indexDef: row.index_def,
      }));

      console.log(`   Found ${this.results.indexes.length} indexes (excluding primary keys)`);

      // Group by table
      const indexesByTable = this.results.indexes.reduce((acc, idx) => {
        if (!acc[idx.tableName]) acc[idx.tableName] = [];
        acc[idx.tableName].push(idx.indexName);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [table, indexes] of Object.entries(indexesByTable)) {
        console.log(`   ✅ ${table}: ${indexes.length} indexes`);
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Index verification failed: ${error.message}`);
      console.error(`❌ Index verification failed: ${error.message}`);
      return false;
    }
  }

  async verifyConstraints(): Promise<boolean> {
    console.log('\n🔒 Verifying constraints...');

    try {
      const result = await this.pool.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
        ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
      `);

      this.results.constraints = result.rows.map(row => ({
        constraintName: row.constraint_name,
        tableName: row.table_name,
        constraintType: row.constraint_type,
      }));

      console.log(`   Found ${this.results.constraints.length} constraints`);

      // Group by type
      const constraintsByType = this.results.constraints.reduce((acc, c) => {
        if (!acc[c.constraintType]) acc[c.constraintType] = 0;
        acc[c.constraintType]++;
        return acc;
      }, {} as Record<string, number>);

      for (const [type, count] of Object.entries(constraintsByType)) {
        console.log(`   ✅ ${type}: ${count}`);
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Constraint verification failed: ${error.message}`);
      console.error(`❌ Constraint verification failed: ${error.message}`);
      return false;
    }
  }

  async verifyTriggersAndFunctions(): Promise<boolean> {
    console.log('\n⚡ Verifying triggers and functions...');

    try {
      // Check triggers
      const triggerResult = await this.pool.query(`
        SELECT 
          t.trigger_name,
          t.event_object_table as table_name,
          t.event_manipulation
        FROM information_schema.triggers t
        WHERE t.trigger_schema = 'public'
        ORDER BY t.event_object_table, t.trigger_name
      `);

      this.results.triggers = triggerResult.rows.map(row => ({
        triggerName: row.trigger_name,
        tableName: row.table_name,
        eventManipulation: row.event_manipulation,
      }));

      console.log(`   Found ${this.results.triggers.length} triggers`);
      for (const trigger of this.results.triggers) {
        console.log(`   ✅ ${trigger.triggerName} on ${trigger.tableName} (${trigger.eventManipulation})`);
      }

      // Check functions
      const functionResult = await this.pool.query(`
        SELECT 
          p.proname as function_name,
          pg_get_function_result(p.oid) as return_type
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
        ORDER BY p.proname
      `);

      this.results.functions = functionResult.rows.map(row => ({
        functionName: row.function_name,
        returnType: row.return_type,
      }));

      console.log(`   Found ${this.results.functions.length} functions`);
      for (const func of this.results.functions) {
        console.log(`   ✅ ${func.functionName}() -> ${func.returnType}`);
      }

      // Verify expected triggers exist
      const expectedTriggers = [
        'update_season_points_updated_at',
        'update_player_last_seen_on_session',
      ];

      const foundTriggers = this.results.triggers.map(t => t.triggerName);
      const missingTriggers = expectedTriggers.filter(t => !foundTriggers.includes(t));

      if (missingTriggers.length > 0) {
        this.results.errors.push(`Missing triggers: ${missingTriggers.join(', ')}`);
        console.error(`   ❌ Missing triggers: ${missingTriggers.join(', ')}`);
        return false;
      }

      // Verify expected functions exist
      const expectedFunctions = [
        'update_updated_at_column',
        'update_player_last_seen',
      ];

      const foundFunctions = this.results.functions.map(f => f.functionName);
      const missingFunctions = expectedFunctions.filter(f => !foundFunctions.includes(f));

      if (missingFunctions.length > 0) {
        this.results.errors.push(`Missing functions: ${missingFunctions.join(', ')}`);
        console.error(`   ❌ Missing functions: ${missingFunctions.join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Trigger/function verification failed: ${error.message}`);
      console.error(`❌ Trigger/function verification failed: ${error.message}`);
      return false;
    }
  }

  async verifyExtensions(): Promise<boolean> {
    console.log('\n🔌 Verifying PostgreSQL extensions...');

    try {
      const result = await this.pool.query(`
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pg_stat_statements')
        ORDER BY extname
      `);

      const extensions = result.rows.map(row => ({
        name: row.extname,
        version: row.extversion,
      }));

      console.log(`   Found ${extensions.length} extensions`);
      for (const ext of extensions) {
        console.log(`   ✅ ${ext.name} (version ${ext.version})`);
      }

      const expectedExtensions = ['uuid-ossp', 'pg_stat_statements'];
      const foundExtensions = extensions.map(e => e.name);
      const missingExtensions = expectedExtensions.filter(e => !foundExtensions.includes(e));

      if (missingExtensions.length > 0) {
        this.results.errors.push(`Missing extensions: ${missingExtensions.join(', ')}`);
        console.error(`   ❌ Missing extensions: ${missingExtensions.join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      this.results.errors.push(`Extension verification failed: ${error.message}`);
      console.error(`❌ Extension verification failed: ${error.message}`);
      return false;
    }
  }

  async testBasicOperations(): Promise<boolean> {
    console.log('\n🧪 Testing basic database operations...');

    try {
      // Test INSERT
      console.log('   Testing INSERT...');
      const insertResult = await this.pool.query(`
        INSERT INTO players (stake_key, username)
        VALUES ($1, $2)
        RETURNING id, created_at
      `, ['stake_test_migration_' + Date.now(), 'test_user_' + Date.now()]);
      
      const testPlayerId = insertResult.rows[0].id;
      console.log(`   ✅ INSERT successful (ID: ${testPlayerId})`);

      // Test SELECT
      console.log('   Testing SELECT...');
      const selectResult = await this.pool.query(`
        SELECT * FROM players WHERE id = $1
      `, [testPlayerId]);
      
      if (selectResult.rows.length !== 1) {
        throw new Error('SELECT returned unexpected number of rows');
      }
      console.log(`   ✅ SELECT successful`);

      // Test UPDATE
      console.log('   Testing UPDATE...');
      await this.pool.query(`
        UPDATE players SET last_seen_at = NOW() WHERE id = $1
      `, [testPlayerId]);
      console.log(`   ✅ UPDATE successful`);

      // Test DELETE
      console.log('   Testing DELETE...');
      await this.pool.query(`
        DELETE FROM players WHERE id = $1
      `, [testPlayerId]);
      console.log(`   ✅ DELETE successful`);

      // Test JSONB operations
      console.log('   Testing JSONB operations...');
      const jsonbResult = await this.pool.query(`
        SELECT '{"test": "value", "number": 42}'::jsonb->>'test' as test_value
      `);
      
      if (jsonbResult.rows[0].test_value !== 'value') {
        throw new Error('JSONB operation failed');
      }
      console.log(`   ✅ JSONB operations successful`);

      return true;
    } catch (error) {
      this.results.errors.push(`Basic operations test failed: ${error.message}`);
      console.error(`❌ Basic operations test failed: ${error.message}`);
      return false;
    }
  }

  async generateReport(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n📈 Summary:');
    console.log(`   Tables: ${this.results.tables.length}`);
    console.log(`   Indexes: ${this.results.indexes.length}`);
    console.log(`   Constraints: ${this.results.constraints.length}`);
    console.log(`   Triggers: ${this.results.triggers.length}`);
    console.log(`   Functions: ${this.results.functions.length}`);

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(e => console.log(`   - ${e}`));
      this.results.success = false;
    }

    console.log('\n' + '='.repeat(80));
    if (this.results.success) {
      console.log('✅ ALL TESTS PASSED - Database migration successful!');
    } else {
      console.log('❌ TESTS FAILED - Please review errors above');
    }
    console.log('='.repeat(80) + '\n');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async runAllTests(): Promise<boolean> {
    console.log('🚀 Starting Neon Database Migration Tests\n');

    const tests = [
      { name: 'Connection', fn: () => this.testConnection() },
      { name: 'Migrations', fn: () => this.runMigrations() },
      { name: 'Extensions', fn: () => this.verifyExtensions() },
      { name: 'Tables', fn: () => this.verifyTables() },
      { name: 'Indexes', fn: () => this.verifyIndexes() },
      { name: 'Constraints', fn: () => this.verifyConstraints() },
      { name: 'Triggers & Functions', fn: () => this.verifyTriggersAndFunctions() },
      { name: 'Basic Operations', fn: () => this.testBasicOperations() },
    ];

    for (const test of tests) {
      const success = await test.fn();
      if (!success) {
        console.log(`\n❌ Test suite stopped due to failure in: ${test.name}`);
        break;
      }
    }

    await this.generateReport();
    return this.results.success;
  }
}

// Main execution
async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set');
    console.error('   Please set one of these variables to your Neon connection string');
    process.exit(1);
  }

  console.log('🔗 Using connection string from environment variable\n');

  const tester = new NeonMigrationTester(connectionString);

  try {
    const success = await tester.runAllTests();
    await tester.close();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
    await tester.close();
    process.exit(1);
  }
}

// Run if executed directly
main();

export { NeonMigrationTester };
