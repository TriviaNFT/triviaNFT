/**
 * Restore Database to Neon Production
 * 
 * This script restores a backup to Neon production database:
 * 1. Validates backup file and metadata
 * 2. Restores backup to Neon database
 * 3. Verifies all data migrated correctly
 * 4. Compares row counts and data integrity
 * 5. Tests critical queries
 * 
 * Requirements: Task 23.2
 */

import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

interface BackupMetadata {
  timestamp: string;
  filename: string;
  size: number;
  checksum: string;
  databaseUrl: string;
  tables: string[];
  rowCounts: Record<string, number>;
  success: boolean;
  error?: string;
}

interface RestoreResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  tablesRestored: number;
  rowCountMatches: Record<string, { original: number; restored: number; match: boolean }>;
  criticalQueriesPass: boolean;
}

class DatabaseRestore {
  private backupDir: string;
  private neonPool: Pool;
  private result: RestoreResult;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.result = {
      success: false,
      errors: [],
      warnings: [],
      tablesRestored: 0,
      rowCountMatches: {},
      criticalQueriesPass: false,
    };
  }

  /**
   * Initialize Neon database connection
   */
  private initializeNeonConnection(): void {
    const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!neonUrl) {
      throw new Error('NEON_DATABASE_URL, DATABASE_URL_UNPOOLED, or DATABASE_URL environment variable not set');
    }

    this.neonPool = new Pool({
      connectionString: neonUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });

    console.log('✅ Neon database connection initialized');
  }

  /**
   * List available backups
   */
  listAvailableBackups(): string[] {
    if (!fs.existsSync(this.backupDir)) {
      console.log('⚠️  No backups directory found');
      return [];
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first

    return files;
  }

  /**
   * Load backup metadata
   */
  loadBackupMetadata(backupFilename: string): BackupMetadata | null {
    const metadataFilename = backupFilename.replace('.sql', '.json');
    const metadataPath = path.join(this.backupDir, metadataFilename);

    if (!fs.existsSync(metadataPath)) {
      console.log(`⚠️  No metadata file found: ${metadataFilename}`);
      return null;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify backup file integrity
   */
  async verifyBackupFile(backupFilename: string, metadata: BackupMetadata | null): Promise<boolean> {
    console.log('\n🔍 Verifying backup file...');

    const backupPath = path.join(this.backupDir, backupFilename);

    // Check file exists
    if (!fs.existsSync(backupPath)) {
      this.result.errors.push(`Backup file not found: ${backupFilename}`);
      console.error(`❌ Backup file not found: ${backupFilename}`);
      return false;
    }

    const stats = fs.statSync(backupPath);
    console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Verify checksum if metadata available
    if (metadata && metadata.checksum) {
      console.log('   Calculating checksum...');
      const checksum = await this.calculateChecksum(backupPath);
      
      if (checksum !== metadata.checksum) {
        this.result.errors.push('Checksum mismatch - backup file may be corrupted');
        console.error(`❌ Checksum mismatch!`);
        console.error(`   Expected: ${metadata.checksum.substring(0, 32)}...`);
        console.error(`   Got:      ${checksum.substring(0, 32)}...`);
        return false;
      }

      console.log(`✅ Checksum verified: ${checksum.substring(0, 16)}...`);
    } else {
      this.result.warnings.push('No metadata available - skipping checksum verification');
      console.log('   ⚠️  No metadata - skipping checksum verification');
    }

    // Verify file structure
    const content = fs.readFileSync(backupPath, 'utf8');
    
    if (!content.includes('PostgreSQL database dump')) {
      this.result.errors.push('Invalid backup file: Missing PostgreSQL dump header');
      console.error('❌ Invalid backup file format');
      return false;
    }

    console.log('✅ Backup file verified');
    return true;
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filepath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Restore backup to Neon database
   */
  async restoreBackup(backupFilename: string): Promise<boolean> {
    console.log('\n📦 Restoring backup to Neon...');

    const backupPath = path.join(this.backupDir, backupFilename);
    const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

    try {
      console.log('   Running psql restore...');
      console.log('   This may take several minutes depending on database size...');

      // Use psql to restore the backup
      // The backup file already contains DROP statements (--clean flag from backup)
      const command = `psql "${neonUrl}" < "${backupPath}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
      });

      // psql outputs to stderr even for successful operations
      if (stderr) {
        const errorLines = stderr.split('\n').filter(line => 
          line.includes('ERROR') && 
          !line.includes('already exists') &&
          !line.includes('does not exist')
        );

        if (errorLines.length > 0) {
          console.log('   ⚠️  Some errors occurred during restore:');
          errorLines.slice(0, 5).forEach(line => console.log(`      ${line}`));
          if (errorLines.length > 5) {
            console.log(`      ... and ${errorLines.length - 5} more errors`);
          }
          this.result.warnings.push(`${errorLines.length} errors during restore (may be non-critical)`);
        }
      }

      console.log('✅ Backup restored to Neon');
      return true;
    } catch (error) {
      this.result.errors.push(`Restore failed: ${error.message}`);
      console.error(`❌ Restore failed: ${error.message}`);
      
      // Show stderr if available
      if (error.stderr) {
        console.error('\n   Error output:');
        console.error(error.stderr.split('\n').slice(0, 10).join('\n'));
      }
      
      return false;
    }
  }

  /**
   * Get current table list and row counts from Neon
   */
  async getRestoredTableInfo(): Promise<Record<string, number>> {
    console.log('\n📊 Collecting restored table information...');

    const rowCounts: Record<string, number> = {};

    try {
      // Get list of tables
      const tablesResult = await this.neonPool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tables = tablesResult.rows.map(row => row.table_name);
      this.result.tablesRestored = tables.length;
      console.log(`   Found ${tables.length} tables`);

      // Get row counts for each table
      for (const table of tables) {
        try {
          const countResult = await this.neonPool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = parseInt(countResult.rows[0].count);
          rowCounts[table] = count;
          console.log(`   ✅ ${table}: ${count.toLocaleString()} rows`);
        } catch (error) {
          console.log(`   ⚠️  ${table}: Could not get row count`);
          rowCounts[table] = -1;
        }
      }

      return rowCounts;
    } catch (error) {
      this.result.errors.push(`Failed to collect table info: ${error.message}`);
      console.error(`❌ Failed to collect table info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare row counts between original and restored database
   */
  compareRowCounts(originalCounts: Record<string, number>, restoredCounts: Record<string, number>): boolean {
    console.log('\n🔍 Comparing row counts...');

    let allMatch = true;
    const tables = new Set([...Object.keys(originalCounts), ...Object.keys(restoredCounts)]);

    for (const table of tables) {
      const original = originalCounts[table] || 0;
      const restored = restoredCounts[table] || 0;
      const match = original === restored;

      this.result.rowCountMatches[table] = { original, restored, match };

      if (!match) {
        allMatch = false;
        console.log(`   ❌ ${table}: ${original} → ${restored} (MISMATCH)`);
        this.result.errors.push(`Row count mismatch in ${table}: expected ${original}, got ${restored}`);
      } else if (original > 0) {
        console.log(`   ✅ ${table}: ${original} rows (match)`);
      }
    }

    if (allMatch) {
      console.log('\n✅ All row counts match!');
    } else {
      console.log('\n❌ Some row counts do not match');
    }

    return allMatch;
  }

  /**
   * Test critical queries to verify data integrity
   */
  async testCriticalQueries(): Promise<boolean> {
    console.log('\n🧪 Testing critical queries...');

    const queries = [
      {
        name: 'Players table query',
        sql: 'SELECT COUNT(*) as count FROM players WHERE stake_key IS NOT NULL',
        validate: (result: any) => result.rows[0].count >= 0,
      },
      {
        name: 'Sessions with player join',
        sql: `SELECT s.id, p.username 
              FROM sessions s 
              JOIN players p ON s.player_id = p.id 
              LIMIT 1`,
        validate: (result: any) => true, // Just needs to execute
      },
      {
        name: 'Eligibilities with expiration check',
        sql: `SELECT COUNT(*) as count 
              FROM eligibilities 
              WHERE expires_at > NOW()`,
        validate: (result: any) => result.rows[0].count >= 0,
      },
      {
        name: 'NFT catalog query',
        sql: 'SELECT COUNT(*) as count FROM nft_catalog WHERE is_minted = false',
        validate: (result: any) => result.rows[0].count >= 0,
      },
      {
        name: 'Player NFTs with category join',
        sql: `SELECT pn.id, c.name 
              FROM player_nfts pn 
              JOIN nft_catalog nc ON pn.catalog_id = nc.id 
              JOIN categories c ON nc.category_id = c.id 
              LIMIT 1`,
        validate: (result: any) => true,
      },
      {
        name: 'Forge operations query',
        sql: 'SELECT COUNT(*) as count FROM forge_operations WHERE status = $1',
        params: ['confirmed'],
        validate: (result: any) => result.rows[0].count >= 0,
      },
      {
        name: 'JSONB query on sessions',
        sql: `SELECT id, question_history 
              FROM sessions 
              WHERE question_history IS NOT NULL 
              LIMIT 1`,
        validate: (result: any) => true,
      },
      {
        name: 'Leaderboard aggregation',
        sql: `SELECT player_id, SUM(points) as total_points 
              FROM sessions 
              GROUP BY player_id 
              ORDER BY total_points DESC 
              LIMIT 5`,
        validate: (result: any) => true,
      },
    ];

    let allPassed = true;

    for (const query of queries) {
      try {
        console.log(`   Testing: ${query.name}...`);
        const result = query.params 
          ? await this.neonPool.query(query.sql, query.params)
          : await this.neonPool.query(query.sql);

        if (query.validate(result)) {
          console.log(`   ✅ ${query.name} passed`);
        } else {
          console.log(`   ❌ ${query.name} failed validation`);
          this.result.errors.push(`Query validation failed: ${query.name}`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`   ❌ ${query.name} failed: ${error.message}`);
        this.result.errors.push(`Query failed: ${query.name} - ${error.message}`);
        allPassed = false;
      }
    }

    this.result.criticalQueriesPass = allPassed;

    if (allPassed) {
      console.log('\n✅ All critical queries passed!');
    } else {
      console.log('\n❌ Some critical queries failed');
    }

    return allPassed;
  }

  /**
   * Verify database extensions
   */
  async verifyExtensions(): Promise<boolean> {
    console.log('\n🔌 Verifying PostgreSQL extensions...');

    try {
      const result = await this.neonPool.query(`
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

      const expectedExtensions = ['uuid-ossp'];
      const foundExtensions = extensions.map(e => e.name);
      const missingExtensions = expectedExtensions.filter(e => !foundExtensions.includes(e));

      if (missingExtensions.length > 0) {
        this.result.errors.push(`Missing extensions: ${missingExtensions.join(', ')}`);
        console.error(`   ❌ Missing extensions: ${missingExtensions.join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      this.result.errors.push(`Extension verification failed: ${error.message}`);
      console.error(`❌ Extension verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate restore report
   */
  generateReport(backupFilename: string, metadata: BackupMetadata | null): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESTORE REPORT');
    console.log('='.repeat(80));

    console.log('\n📦 Backup Details:');
    console.log(`   Filename: ${backupFilename}`);
    if (metadata) {
      console.log(`   Original timestamp: ${metadata.timestamp}`);
      console.log(`   Original size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Original tables: ${metadata.tables.length}`);
    }

    console.log('\n🗄️  Restore Results:');
    console.log(`   Tables restored: ${this.result.tablesRestored}`);
    console.log(`   Critical queries: ${this.result.criticalQueriesPass ? 'PASSED' : 'FAILED'}`);

    // Show row count comparison summary
    const matches = Object.values(this.result.rowCountMatches).filter(m => m.match).length;
    const total = Object.keys(this.result.rowCountMatches).length;
    console.log(`   Row count matches: ${matches}/${total}`);

    if (this.result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.result.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (this.result.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.result.errors.forEach(e => console.log(`   - ${e}`));
    }

    // Show mismatched tables
    const mismatches = Object.entries(this.result.rowCountMatches)
      .filter(([_, counts]) => !counts.match);

    if (mismatches.length > 0) {
      console.log('\n⚠️  Row Count Mismatches:');
      mismatches.forEach(([table, counts]) => {
        console.log(`   - ${table}: ${counts.original} → ${counts.restored}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    if (this.result.success) {
      console.log('✅ RESTORE COMPLETED SUCCESSFULLY');
      console.log('\n📝 Next Steps:');
      console.log('   1. Verify application functionality with restored database');
      console.log('   2. Run integration tests');
      console.log('   3. Check application logs for any issues');
      console.log('   4. Monitor database performance');
    } else {
      console.log('❌ RESTORE FAILED OR INCOMPLETE');
      console.log('\n📝 Recommended Actions:');
      console.log('   1. Review errors above');
      console.log('   2. Check database connection settings');
      console.log('   3. Verify backup file integrity');
      console.log('   4. Consider restoring to a test database first');
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run complete restore process
   */
  async run(backupFilename?: string): Promise<boolean> {
    console.log('🚀 Starting Database Restore to Neon\n');

    try {
      // Step 1: Initialize Neon connection
      this.initializeNeonConnection();

      // Step 2: Select backup file
      if (!backupFilename) {
        const backups = this.listAvailableBackups();
        
        if (backups.length === 0) {
          throw new Error('No backup files found in backups directory');
        }

        console.log('\n📋 Available backups:');
        backups.forEach((backup, index) => {
          console.log(`   ${index + 1}. ${backup}`);
        });

        // Use most recent backup
        backupFilename = backups[0];
        console.log(`\n✅ Using most recent backup: ${backupFilename}`);
      }

      // Step 3: Load backup metadata
      const metadata = this.loadBackupMetadata(backupFilename);
      if (metadata) {
        console.log('✅ Backup metadata loaded');
      }

      // Step 4: Verify backup file
      const isValid = await this.verifyBackupFile(backupFilename, metadata);
      if (!isValid) {
        throw new Error('Backup file verification failed');
      }

      // Step 5: Restore backup
      const restored = await this.restoreBackup(backupFilename);
      if (!restored) {
        throw new Error('Backup restore failed');
      }

      // Step 6: Get restored table info
      const restoredCounts = await this.getRestoredTableInfo();

      // Step 7: Compare row counts
      if (metadata && metadata.rowCounts) {
        this.compareRowCounts(metadata.rowCounts, restoredCounts);
      } else {
        this.result.warnings.push('No original row counts available for comparison');
        console.log('\n⚠️  No original row counts available for comparison');
      }

      // Step 8: Verify extensions
      await this.verifyExtensions();

      // Step 9: Test critical queries
      await this.testCriticalQueries();

      // Determine overall success
      this.result.success = this.result.errors.length === 0 && this.result.criticalQueriesPass;

      // Step 10: Generate report
      this.generateReport(backupFilename, metadata);

      return this.result.success;
    } catch (error) {
      console.error(`\n💥 Restore failed: ${error.message}`);
      this.result.success = false;
      this.result.errors.push(error.message);
      this.generateReport(backupFilename || 'unknown', null);
      return false;
    } finally {
      await this.neonPool.end();
    }
  }
}

// Main execution
async function main() {
  const backupFilename = process.argv[2]; // Optional: specify backup file
  
  const restore = new DatabaseRestore();
  const success = await restore.run(backupFilename);
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseRestore };
