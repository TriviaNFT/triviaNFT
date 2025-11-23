/**
 * Production Database Backup Script
 * 
 * This script creates a full backup of the production database:
 * 1. Creates a timestamped backup file using pg_dump
 * 2. Verifies backup integrity
 * 3. Stores backup securely with metadata
 * 4. Generates backup report
 * 
 * Requirements: Task 23.1
 */

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

class DatabaseBackup {
  private backupDir: string;
  private timestamp: string;
  private metadata: BackupMetadata;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.metadata = {
      timestamp: new Date().toISOString(),
      filename: '',
      size: 0,
      checksum: '',
      databaseUrl: '',
      tables: [],
      rowCounts: {},
      success: false,
    };
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`✅ Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Get database connection string from environment
   */
  private getDatabaseUrl(): string {
    const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED environment variable not set');
    }

    // Mask password in metadata
    const urlObj = new URL(dbUrl);
    this.metadata.databaseUrl = `${urlObj.protocol}//${urlObj.username}:****@${urlObj.host}${urlObj.pathname}`;

    return dbUrl;
  }

  /**
   * Create database backup using pg_dump
   */
  async createBackup(): Promise<string> {
    console.log('📦 Creating database backup...');
    
    const dbUrl = this.getDatabaseUrl();
    const filename = `backup-${this.timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    this.metadata.filename = filename;

    try {
      // Use pg_dump to create backup
      // --clean: Add DROP statements before CREATE
      // --if-exists: Use IF EXISTS with DROP statements
      // --no-owner: Don't output commands to set ownership
      // --no-privileges: Don't output commands to set privileges
      const command = `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges > "${filepath}"`;
      
      console.log(`   Running pg_dump...`);
      await execAsync(command);

      // Check if file was created
      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file was not created');
      }

      const stats = fs.statSync(filepath);
      this.metadata.size = stats.size;

      console.log(`✅ Backup created: ${filename}`);
      console.log(`   Size: ${(this.metadata.size / 1024 / 1024).toFixed(2)} MB`);

      return filepath;
    } catch (error) {
      this.metadata.error = error.message;
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Calculate checksum for backup file
   */
  async calculateChecksum(filepath: string): Promise<string> {
    console.log('\n🔐 Calculating backup checksum...');

    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filepath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const checksum = hash.digest('hex');
        this.metadata.checksum = checksum;
        console.log(`✅ Checksum: ${checksum.substring(0, 16)}...`);
        resolve(checksum);
      });
      stream.on('error', reject);
    });
  }

  /**
   * Verify backup integrity by checking if it's valid SQL
   */
  async verifyBackupIntegrity(filepath: string): Promise<boolean> {
    console.log('\n🔍 Verifying backup integrity...');

    try {
      // Read first and last few lines to verify structure
      const content = fs.readFileSync(filepath, 'utf8');
      
      // Check for SQL dump header
      if (!content.includes('PostgreSQL database dump')) {
        throw new Error('Invalid backup file: Missing PostgreSQL dump header');
      }

      // Check for common SQL statements
      const hasCreateStatements = content.includes('CREATE TABLE');
      const hasInsertStatements = content.includes('INSERT INTO') || content.includes('COPY');
      
      if (!hasCreateStatements) {
        console.log('   ⚠️  Warning: No CREATE TABLE statements found');
      }

      if (!hasInsertStatements) {
        console.log('   ⚠️  Warning: No data INSERT/COPY statements found');
      }

      // Check file is not corrupted (ends properly)
      const lines = content.split('\n');
      const lastLines = lines.slice(-10).join('\n');
      
      if (!lastLines.includes('PostgreSQL database dump complete')) {
        throw new Error('Invalid backup file: Missing completion marker');
      }

      console.log('✅ Backup integrity verified');
      console.log(`   File contains ${lines.length.toLocaleString()} lines`);
      console.log(`   Has CREATE statements: ${hasCreateStatements}`);
      console.log(`   Has data statements: ${hasInsertStatements}`);

      return true;
    } catch (error) {
      this.metadata.error = error.message;
      console.error(`❌ Backup integrity check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get table list and row counts from database
   */
  async getTableInfo(): Promise<void> {
    console.log('\n📊 Collecting table information...');

    const { Pool } = await import('pg');
    const dbUrl = this.getDatabaseUrl();
    
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      // Get list of tables
      const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      this.metadata.tables = tablesResult.rows.map(row => row.table_name);
      console.log(`   Found ${this.metadata.tables.length} tables`);

      // Get row counts for each table
      for (const table of this.metadata.tables) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = parseInt(countResult.rows[0].count);
          this.metadata.rowCounts[table] = count;
          console.log(`   ✅ ${table}: ${count.toLocaleString()} rows`);
        } catch (error) {
          console.log(`   ⚠️  ${table}: Could not get row count`);
          this.metadata.rowCounts[table] = -1;
        }
      }
    } catch (error) {
      console.error(`❌ Failed to collect table info: ${error.message}`);
      throw error;
    } finally {
      await pool.end();
    }
  }

  /**
   * Save backup metadata to JSON file
   */
  saveMetadata(): void {
    console.log('\n💾 Saving backup metadata...');

    const metadataFilename = `backup-${this.timestamp}.json`;
    const metadataPath = path.join(this.backupDir, metadataFilename);

    fs.writeFileSync(metadataPath, JSON.stringify(this.metadata, null, 2));
    console.log(`✅ Metadata saved: ${metadataFilename}`);
  }

  /**
   * Generate backup report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 BACKUP REPORT');
    console.log('='.repeat(80));

    console.log('\n📦 Backup Details:');
    console.log(`   Timestamp: ${this.metadata.timestamp}`);
    console.log(`   Filename: ${this.metadata.filename}`);
    console.log(`   Size: ${(this.metadata.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Checksum: ${this.metadata.checksum.substring(0, 32)}...`);
    console.log(`   Location: ${this.backupDir}`);

    console.log('\n🗄️  Database Info:');
    console.log(`   Connection: ${this.metadata.databaseUrl}`);
    console.log(`   Tables: ${this.metadata.tables.length}`);

    console.log('\n📊 Row Counts:');
    const totalRows = Object.values(this.metadata.rowCounts).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);
    console.log(`   Total rows: ${totalRows.toLocaleString()}`);
    
    // Show tables with most data
    const sortedTables = Object.entries(this.metadata.rowCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10);

    console.log('\n   Top tables by row count:');
    sortedTables.forEach(([table, count]) => {
      console.log(`   - ${table}: ${count.toLocaleString()} rows`);
    });

    console.log('\n' + '='.repeat(80));
    if (this.metadata.success) {
      console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
      console.log('\n📝 Next Steps:');
      console.log('   1. Verify backup file exists and is readable');
      console.log('   2. Store backup in secure location (S3, external drive, etc.)');
      console.log('   3. Test restore process in non-production environment');
      console.log(`   4. Keep metadata file: backup-${this.timestamp}.json`);
    } else {
      console.log('❌ BACKUP FAILED');
      if (this.metadata.error) {
        console.log(`   Error: ${this.metadata.error}`);
      }
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run complete backup process
   */
  async run(): Promise<boolean> {
    console.log('🚀 Starting Production Database Backup\n');

    try {
      // Step 1: Ensure backup directory exists
      this.ensureBackupDirectory();

      // Step 2: Get table information before backup
      await this.getTableInfo();

      // Step 3: Create backup
      const filepath = await this.createBackup();

      // Step 4: Calculate checksum
      await this.calculateChecksum(filepath);

      // Step 5: Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(filepath);
      
      if (!isValid) {
        throw new Error('Backup integrity verification failed');
      }

      // Step 6: Save metadata
      this.metadata.success = true;
      this.saveMetadata();

      // Step 7: Generate report
      this.generateReport();

      return true;
    } catch (error) {
      console.error(`\n💥 Backup failed: ${error.message}`);
      this.metadata.success = false;
      this.metadata.error = error.message;
      this.generateReport();
      return false;
    }
  }
}

// Main execution
async function main() {
  const backup = new DatabaseBackup();
  const success = await backup.run();
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseBackup };
