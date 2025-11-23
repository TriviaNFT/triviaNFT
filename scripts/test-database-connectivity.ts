#!/usr/bin/env tsx

/**
 * Database Connectivity Test Script
 * Tests Neon PostgreSQL connection, query execution, and connection pooling
 * 
 * This script can be run locally or in the preview deployment environment
 */

import { getPool, query, healthCheck, getStats, closePool } from '../services/api/src/db/connection';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
  details?: any;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<{ passed: boolean; details?: any }>
): Promise<void> {
  const start = Date.now();
  try {
    const { passed, details } = await fn();
    const duration = Date.now() - start;
    results.push({
      name,
      passed,
      message: passed ? `✅ ${name}` : `❌ ${name}`,
      duration,
      details,
    });
  } catch (error) {
    const duration = Date.now() - start;
    results.push({
      name,
      passed: false,
      message: `❌ ${name}`,
      duration,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  console.log('🗄️  Testing Database Connectivity\n');
  console.log('═'.repeat(80));

  // Check environment variable
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL environment variable is not set\n');
    console.error('Please set DATABASE_URL in your .env.local file or environment.\n');
    console.error('See VERCEL_SETUP.md for configuration instructions.\n');
    process.exit(1);
  }

  console.log('\n📋 Configuration:\n');
  
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`  Host: ${dbUrl.hostname}`);
    console.log(`  Database: ${dbUrl.pathname.slice(1)}`);
    console.log(`  SSL: ${dbUrl.searchParams.get('sslmode') || 'enabled'}`);
    console.log(`  Pooled: ${dbUrl.hostname.includes('-pooler.') ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('\n❌ Invalid DATABASE_URL format\n');
    console.error('Expected format: postgresql://user:password@host:port/database\n');
    console.error('See VERCEL_SETUP.md for configuration instructions.\n');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n🧪 Running Tests:\n');

  // Test 1: Basic connection
  await test('Basic Connection', async () => {
    const pool = await getPool();
    return { passed: !!pool };
  });

  // Test 2: Health check
  await test('Health Check Query', async () => {
    const healthy = await healthCheck();
    return { passed: healthy };
  });

  // Test 3: Simple SELECT query
  await test('Simple SELECT Query', async () => {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    return {
      passed: result.rows.length > 0,
      details: {
        currentTime: result.rows[0]?.current_time,
        pgVersion: result.rows[0]?.pg_version?.split(' ')[0],
      },
    };
  });

  // Test 4: Table existence check
  await test('Check Tables Exist', async () => {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'players',
      'sessions',
      'eligibilities',
      'mints',
      'forge_operations',
      'player_nfts',
      'categories',
      'questions',
    ];
    
    const actualTables = result.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !actualTables.includes(t));
    
    return {
      passed: missingTables.length === 0,
      details: {
        found: actualTables.length,
        expected: expectedTables.length,
        missing: missingTables,
      },
    };
  });

  // Test 5: Query with parameters
  await test('Parameterized Query', async () => {
    const result = await query(
      'SELECT $1::text as test_param, $2::int as test_number',
      ['hello', 42]
    );
    return {
      passed: result.rows[0]?.test_param === 'hello' && result.rows[0]?.test_number === 42,
    };
  });

  // Test 6: Connection pool stats
  await test('Connection Pool Stats', async () => {
    const stats = await getStats();
    return {
      passed: stats.totalConnections >= 0,
      details: stats,
    };
  });

  // Test 7: Multiple concurrent queries
  await test('Concurrent Queries', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      query('SELECT $1::int as query_num', [i])
    );
    
    const results = await Promise.all(promises);
    const allSucceeded = results.every((r, i) => r.rows[0]?.query_num === i);
    
    return {
      passed: allSucceeded,
      details: { queriesExecuted: results.length },
    };
  });

  // Test 8: Query performance
  await test('Query Performance', async () => {
    const start = Date.now();
    await query('SELECT COUNT(*) as count FROM players');
    const duration = Date.now() - start;
    
    return {
      passed: duration < 1000, // Should complete in < 1 second
      details: { duration: `${duration}ms` },
    };
  });

  // Test 9: Check indexes exist
  await test('Check Indexes Exist', async () => {
    const result = await query(`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    return {
      passed: result.rows.length > 0,
      details: { indexCount: result.rows.length },
    };
  });

  // Test 10: Check constraints
  await test('Check Foreign Key Constraints', async () => {
    const result = await query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);
    
    return {
      passed: result.rows.length > 0,
      details: { foreignKeyCount: result.rows.length },
    };
  });

  // Print results
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Test Results:\n');

  let passCount = 0;
  let failCount = 0;
  let totalDuration = 0;

  results.forEach(result => {
    console.log(`${result.message} ${result.duration ? `(${result.duration}ms)` : ''}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`);
    }
    if (result.passed) passCount++;
    else failCount++;
    totalDuration += result.duration || 0;
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Passed: ${passCount} | ❌ Failed: ${failCount} | ⏱️  Total: ${totalDuration}ms\n`);

  // Cleanup
  await closePool();

  if (failCount === 0) {
    console.log('🎉 All database connectivity tests passed!\n');
    console.log('Database is ready for use in preview deployment.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some database tests failed.\n');
    console.log('Troubleshooting steps:');
    console.log('1. Verify DATABASE_URL is correct');
    console.log('2. Check Neon database branch is active');
    console.log('3. Verify migrations have been run');
    console.log('4. Check Neon console for database errors\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Database test script failed:', error);
  process.exit(1);
});
