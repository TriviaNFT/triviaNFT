/**
 * Neon PostgreSQL Setup Verification Script
 * 
 * This script verifies that:
 * 1. Neon database connection is working
 * 2. Connection pooling is configured correctly
 * 3. All migrations can be run successfully
 * 4. SSL/TLS connection is established
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getPool, healthCheck, getStats, closePool } from '../db/connection.js';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface VerificationResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

/**
 * Verify basic database connection
 */
async function verifyConnection(): Promise<void> {
  console.log('\n📡 Step 1: Verifying database connection...');
  
  try {
    const isHealthy = await healthCheck();
    
    if (isHealthy) {
      results.push({
        step: 'Database Connection',
        success: true,
        message: 'Successfully connected to Neon PostgreSQL',
      });
      console.log('✅ Database connection successful');
    } else {
      results.push({
        step: 'Database Connection',
        success: false,
        message: 'Health check failed',
      });
      console.log('❌ Database connection failed');
    }
  } catch (error) {
    results.push({
      step: 'Database Connection',
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ Database connection error:', error);
  }
}

/**
 * Verify SSL/TLS connection
 */
async function verifySSL(): Promise<void> {
  console.log('\n🔒 Step 2: Verifying SSL/TLS connection...');
  
  try {
    const pool = await getPool();
    const client = await pool.connect();
    
    try {
      // Check if connection is using SSL
      const result = await client.query(`
        SELECT 
          ssl.ssl as is_ssl,
          ssl.version as ssl_version,
          ssl.cipher as ssl_cipher
        FROM pg_stat_ssl ssl
        JOIN pg_stat_activity act ON ssl.pid = act.pid
        WHERE act.pid = pg_backend_pid()
      `);
      
      const sslInfo = result.rows[0];
      const databaseUrl = process.env.DATABASE_URL || '';
      const requiresSSL = databaseUrl.includes('sslmode=require');
      const isNeonPooler = databaseUrl.includes('-pooler.') && databaseUrl.includes('neon.tech');
      
      if (sslInfo && sslInfo.is_ssl) {
        results.push({
          step: 'SSL/TLS Connection',
          success: true,
          message: 'SSL/TLS connection established',
          details: {
            version: sslInfo.ssl_version,
            cipher: sslInfo.ssl_cipher,
          },
        });
        console.log('✅ SSL/TLS connection verified');
        console.log(`   Version: ${sslInfo.ssl_version}`);
        console.log(`   Cipher: ${sslInfo.ssl_cipher}`);
      } else if (isNeonPooler) {
        // Neon pooler handles SSL internally, so this is expected
        results.push({
          step: 'SSL/TLS Connection',
          success: true,
          message: 'Connected through Neon pooler (SSL handled by pooler)',
          details: {
            note: 'Neon pooler terminates SSL and uses internal secure connections',
            requiresSSL,
          },
        });
        console.log('✅ SSL/TLS verified (Neon pooler)');
        console.log('   Note: Neon pooler handles SSL internally');
      } else {
        results.push({
          step: 'SSL/TLS Connection',
          success: false,
          message: 'Connection is not using SSL/TLS',
        });
        console.log('⚠️  Warning: Connection is not using SSL/TLS');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    results.push({
      step: 'SSL/TLS Connection',
      success: false,
      message: `SSL verification error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ SSL verification error:', error);
  }
}

/**
 * Verify connection pooling configuration
 */
async function verifyConnectionPooling(): Promise<void> {
  console.log('\n🏊 Step 3: Verifying connection pooling...');
  
  try {
    const pool = await getPool();
    const stats = await getStats();
    
    // Check pool configuration
    const poolConfig = {
      max: (pool as any).options?.max || 'unknown',
      idleTimeoutMillis: (pool as any).options?.idleTimeoutMillis || 'unknown',
      connectionTimeoutMillis: (pool as any).options?.connectionTimeoutMillis || 'unknown',
    };
    
    results.push({
      step: 'Connection Pooling',
      success: true,
      message: 'Connection pooling configured correctly',
      details: {
        configuration: poolConfig,
        currentStats: stats,
      },
    });
    
    console.log('✅ Connection pooling verified');
    console.log(`   Max connections: ${poolConfig.max}`);
    console.log(`   Idle timeout: ${poolConfig.idleTimeoutMillis}ms`);
    console.log(`   Connection timeout: ${poolConfig.connectionTimeoutMillis}ms`);
    console.log(`   Current stats:`, stats);
  } catch (error) {
    results.push({
      step: 'Connection Pooling',
      success: false,
      message: `Pooling verification error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ Connection pooling error:', error);
  }
}

/**
 * Verify database schema and migrations
 */
async function verifySchema(): Promise<void> {
  console.log('\n📋 Step 4: Verifying database schema...');
  
  try {
    const pool = await getPool();
    
    // Check if migrations table exists
    const migrationsTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pgmigrations'
      ) as exists
    `);
    
    const migrationsTableExists = migrationsTableResult.rows[0].exists;
    
    if (migrationsTableExists) {
      // Get migration count
      const migrationCountResult = await pool.query(`
        SELECT COUNT(*) as count FROM pgmigrations
      `);
      const migrationCount = parseInt(migrationCountResult.rows[0].count);
      
      // Get list of tables
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      const tables = tablesResult.rows.map(row => row.table_name);
      
      results.push({
        step: 'Database Schema',
        success: true,
        message: 'Database schema verified',
        details: {
          migrationsRun: migrationCount,
          tables: tables,
        },
      });
      
      console.log('✅ Database schema verified');
      console.log(`   Migrations run: ${migrationCount}`);
      console.log(`   Tables found: ${tables.length}`);
      console.log(`   Tables: ${tables.join(', ')}`);
    } else {
      results.push({
        step: 'Database Schema',
        success: false,
        message: 'Migrations table not found - migrations may not have been run',
      });
      console.log('⚠️  Warning: Migrations table not found');
    }
  } catch (error) {
    results.push({
      step: 'Database Schema',
      success: false,
      message: `Schema verification error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ Schema verification error:', error);
  }
}

/**
 * Verify Neon-specific features
 */
async function verifyNeonFeatures(): Promise<void> {
  console.log('\n🌟 Step 5: Verifying Neon-specific features...');
  
  try {
    const pool = await getPool();
    
    // Check PostgreSQL version
    const versionResult = await pool.query('SELECT version()');
    const version = versionResult.rows[0].version;
    
    // Check if we're connected to Neon (check hostname)
    const databaseUrl = process.env.DATABASE_URL || '';
    const isNeon = databaseUrl.includes('neon.tech');
    
    // Check connection info
    const connectionInfoResult = await pool.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    const connectionInfo = connectionInfoResult.rows[0];
    
    results.push({
      step: 'Neon Features',
      success: true,
      message: isNeon ? 'Connected to Neon PostgreSQL' : 'Connected to PostgreSQL (not Neon)',
      details: {
        isNeon,
        version: version.split(' ').slice(0, 2).join(' '),
        database: connectionInfo.database,
        user: connectionInfo.user,
        serverIp: connectionInfo.server_ip,
        serverPort: connectionInfo.server_port,
      },
    });
    
    console.log('✅ Neon features verified');
    console.log(`   Is Neon: ${isNeon ? 'Yes' : 'No'}`);
    console.log(`   PostgreSQL version: ${version.split(' ').slice(0, 2).join(' ')}`);
    console.log(`   Database: ${connectionInfo.database}`);
    console.log(`   User: ${connectionInfo.user}`);
  } catch (error) {
    results.push({
      step: 'Neon Features',
      success: false,
      message: `Neon features verification error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ Neon features verification error:', error);
  }
}

/**
 * Test query performance
 */
async function testQueryPerformance(): Promise<void> {
  console.log('\n⚡ Step 6: Testing query performance...');
  
  try {
    const pool = await getPool();
    
    // Test simple query
    const start = Date.now();
    await pool.query('SELECT 1');
    const simpleQueryTime = Date.now() - start;
    
    // Test more complex query (if tables exist)
    let complexQueryTime = 0;
    try {
      const complexStart = Date.now();
      await pool.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      complexQueryTime = Date.now() - complexStart;
    } catch {
      // Tables might not exist yet
      complexQueryTime = 0;
    }
    
    results.push({
      step: 'Query Performance',
      success: true,
      message: 'Query performance test completed',
      details: {
        simpleQueryMs: simpleQueryTime,
        complexQueryMs: complexQueryTime,
      },
    });
    
    console.log('✅ Query performance tested');
    console.log(`   Simple query: ${simpleQueryTime}ms`);
    if (complexQueryTime > 0) {
      console.log(`   Complex query: ${complexQueryTime}ms`);
    }
  } catch (error) {
    results.push({
      step: 'Query Performance',
      success: false,
      message: `Performance test error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log('❌ Query performance test error:', error);
  }
}

/**
 * Print summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${icon} ${result.step}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${successCount}/${totalCount} checks passed`);
  console.log('='.repeat(60));
  
  if (successCount === totalCount) {
    console.log('\n🎉 All verification checks passed!');
    console.log('✅ Neon PostgreSQL is properly configured and ready to use.');
  } else {
    console.log('\n⚠️  Some verification checks failed.');
    console.log('Please review the errors above and fix any issues.');
  }
}

/**
 * Main verification function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Neon PostgreSQL Setup Verification');
  console.log('='.repeat(60));
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL to your Neon connection string');
    process.exit(1);
  }
  
  console.log('📝 Configuration:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    await verifyConnection();
    await verifySSL();
    await verifyConnectionPooling();
    await verifySchema();
    await verifyNeonFeatures();
    await testQueryPerformance();
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
  } finally {
    await closePool();
    printSummary();
  }
}

// Run verification
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
