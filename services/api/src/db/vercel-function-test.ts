/**
 * Vercel Function Database Connection Test
 * 
 * This script simulates a Vercel Function environment to test database connectivity.
 * Run this to verify the database connection works correctly in a serverless context.
 */

import { config } from 'dotenv';
import { getPool, query, healthCheck, getStats, closePool } from './connection.js';

// Load environment variables
config();

async function testVercelFunctionConnection() {
  console.log('🧪 Testing database connection in Vercel Function context...\n');

  try {
    // Test 1: Pool initialization
    console.log('1️⃣ Initializing connection pool...');
    const pool = await getPool();
    console.log('✅ Pool initialized successfully');
    console.log('   - Max connections:', pool.options.max);
    console.log('   - Idle timeout:', pool.options.idleTimeoutMillis, 'ms');
    console.log('   - Connection timeout:', pool.options.connectionTimeoutMillis, 'ms');
    console.log('   - SSL enabled:', !!pool.options.ssl);
    console.log('');

    // Test 2: Simple query
    console.log('2️⃣ Executing simple query...');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query executed successfully');
    console.log('   - Current time:', result.rows[0].current_time);
    console.log('   - PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    console.log('');

    // Test 3: Health check
    console.log('3️⃣ Running health check...');
    const healthy = await healthCheck();
    console.log(healthy ? '✅ Database is healthy' : '❌ Database health check failed');
    console.log('');

    // Test 4: Pool statistics
    console.log('4️⃣ Checking pool statistics...');
    const stats = await getStats();
    console.log('✅ Pool statistics retrieved');
    console.log('   - Total connections:', stats.totalConnections);
    console.log('   - Idle connections:', stats.idleConnections);
    console.log('   - Waiting clients:', stats.waitingClients);
    console.log('');

    // Test 5: Concurrent queries (simulating multiple requests)
    console.log('5️⃣ Testing concurrent queries (simulating 5 simultaneous requests)...');
    const startTime = Date.now();
    const queries = Array.from({ length: 5 }, (_, i) => 
      query('SELECT $1::int as request_id, pg_sleep(0.1)', [i + 1])
    );
    const results = await Promise.all(queries);
    const duration = Date.now() - startTime;
    console.log('✅ All concurrent queries completed');
    console.log('   - Requests processed:', results.length);
    console.log('   - Total duration:', duration, 'ms');
    console.log('   - Average per request:', Math.round(duration / results.length), 'ms');
    console.log('');

    // Test 6: Verify Neon-specific features
    console.log('6️⃣ Verifying Neon-specific configuration...');
    const connectionString = process.env.DATABASE_URL || '';
    const isNeonPooled = connectionString.includes('-pooler.');
    const isNeon = connectionString.includes('neon.tech');
    const hasSSL = connectionString.includes('sslmode=require');
    
    console.log(isNeon ? '✅ Using Neon PostgreSQL' : '⚠️  Not using Neon PostgreSQL');
    console.log(isNeonPooled ? '✅ Using Neon connection pooler' : '⚠️  Using direct connection (consider using pooler)');
    console.log(hasSSL ? '✅ SSL enabled' : '⚠️  SSL not enabled');
    console.log('');

    // Final statistics
    const finalStats = await getStats();
    console.log('📊 Final pool statistics:');
    console.log('   - Total connections:', finalStats.totalConnections);
    console.log('   - Idle connections:', finalStats.idleConnections);
    console.log('   - Waiting clients:', finalStats.waitingClients);
    console.log('');

    console.log('✅ All tests passed! Database connection is ready for Vercel Functions.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    console.log('🧹 Cleaning up connection pool...');
    await closePool();
    console.log('✅ Connection pool closed\n');
  }
}

// Run the test
testVercelFunctionConnection();
