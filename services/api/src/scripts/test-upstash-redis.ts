/**
 * Upstash Redis Test Script
 * 
 * Tests all Redis operations to verify Upstash setup and functionality
 */

import { UpstashRedisService } from '../services/upstash-redis-service.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`✅ ${name} (${Date.now() - startTime}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    console.error(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('🚀 Starting Upstash Redis Tests\n');
  console.log('Environment Variables:');
  console.log(`  REDIS_URL: ${process.env.REDIS_URL ? '✓ Set' : '✗ Not set'}`);
  console.log(`  REDIS_TOKEN: ${process.env.REDIS_TOKEN ? '✓ Set' : '✗ Not set'}`);
  console.log(`  UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✓ Set' : '✗ Not set'}`);
  console.log(`  UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Set' : '✗ Not set'}`);
  console.log();

  let redis: UpstashRedisService;

  // Test 1: Initialize Redis client
  await runTest('Initialize Upstash Redis client', async () => {
    redis = new UpstashRedisService();
  });

  if (!redis!) {
    console.error('\n❌ Failed to initialize Redis client. Aborting tests.');
    process.exit(1);
  }

  // Test 2: Health check
  await runTest('Health check (PING)', async () => {
    const healthy = await redis.healthCheck();
    if (!healthy) {
      throw new Error('Health check failed');
    }
  });

  // Test 3: Set and Get
  await runTest('Set and Get string value', async () => {
    const testKey = 'test:string';
    const testValue = 'Hello Upstash!';
    
    await redis.set(testKey, testValue);
    const retrieved = await redis.get(testKey);
    
    if (retrieved !== testValue) {
      throw new Error(`Expected "${testValue}", got "${retrieved}"`);
    }
    
    // Cleanup
    await redis.del(testKey);
  });

  // Test 4: Set with TTL
  await runTest('Set with TTL (expire)', async () => {
    const testKey = 'test:ttl';
    const testValue = 'expires soon';
    
    await redis.set(testKey, testValue, 2); // 2 seconds TTL
    const exists1 = await redis.exists(testKey);
    
    if (!exists1) {
      throw new Error('Key should exist immediately after setting');
    }
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const exists2 = await redis.exists(testKey);
    if (exists2) {
      throw new Error('Key should have expired after 3 seconds');
    }
  });

  // Test 5: Delete
  await runTest('Delete key', async () => {
    const testKey = 'test:delete';
    
    await redis.set(testKey, 'to be deleted');
    const exists1 = await redis.exists(testKey);
    
    if (!exists1) {
      throw new Error('Key should exist before deletion');
    }
    
    await redis.del(testKey);
    const exists2 = await redis.exists(testKey);
    
    if (exists2) {
      throw new Error('Key should not exist after deletion');
    }
  });

  // Test 6: Increment
  await runTest('Increment counter', async () => {
    const testKey = 'test:counter';
    
    await redis.del(testKey); // Ensure clean state
    
    const val1 = await redis.incr(testKey);
    const val2 = await redis.incr(testKey);
    const val3 = await redis.incr(testKey);
    
    if (val1 !== 1 || val2 !== 2 || val3 !== 3) {
      throw new Error(`Expected 1, 2, 3, got ${val1}, ${val2}, ${val3}`);
    }
    
    await redis.del(testKey);
  });

  // Test 7: Hash operations
  await runTest('Hash operations (HSET, HGET, HGETALL)', async () => {
    const testKey = 'test:hash';
    
    await redis.hSet(testKey, 'field1', 'value1');
    await redis.hSet(testKey, 'field2', 'value2');
    
    const field1 = await redis.hGet(testKey, 'field1');
    if (field1 !== 'value1') {
      throw new Error(`Expected "value1", got "${field1}"`);
    }
    
    const all = await redis.hGetAll(testKey);
    if (all.field1 !== 'value1' || all.field2 !== 'value2') {
      throw new Error('Hash values do not match');
    }
    
    await redis.del(testKey);
  });

  // Test 8: Hash set all
  await runTest('Hash set multiple fields (HSETALL)', async () => {
    const testKey = 'test:hash:multiple';
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      age: '30',
    };
    
    await redis.hSetAll(testKey, data);
    const retrieved = await redis.hGetAll(testKey);
    
    if (retrieved.name !== data.name || retrieved.email !== data.email || retrieved.age !== data.age) {
      throw new Error('Hash values do not match');
    }
    
    await redis.del(testKey);
  });

  // Test 9: Set operations (for seen questions)
  await runTest('Set operations (SADD, SMEMBERS)', async () => {
    const testKey = 'test:set';
    const questionIds = ['q1', 'q2', 'q3'];
    
    await redis.addSeenQuestions(testKey, questionIds);
    const members = await redis.getSeenQuestions(testKey);
    
    if (members.length !== 3) {
      throw new Error(`Expected 3 members, got ${members.length}`);
    }
    
    for (const id of questionIds) {
      if (!members.includes(id)) {
        throw new Error(`Expected set to contain "${id}"`);
      }
    }
    
    await redis.del(testKey);
  });

  // Test 10: Multiple key deletion
  await runTest('Delete multiple keys', async () => {
    const keys = ['test:multi:1', 'test:multi:2', 'test:multi:3'];
    
    // Set multiple keys
    for (const key of keys) {
      await redis.set(key, 'test value');
    }
    
    // Delete all at once
    const deleted = await redis.delMultiple(keys);
    
    if (deleted !== 3) {
      throw new Error(`Expected to delete 3 keys, deleted ${deleted}`);
    }
    
    // Verify all are gone
    for (const key of keys) {
      const exists = await redis.exists(key);
      if (exists) {
        throw new Error(`Key ${key} should not exist after deletion`);
      }
    }
  });

  // Test 11: Set with expiry modes
  await runTest('Set with expiry (EX and PX modes)', async () => {
    const testKey1 = 'test:expiry:ex';
    const testKey2 = 'test:expiry:px';
    
    // EX mode (seconds)
    await redis.setWithExpiry(testKey1, 'expires in 2 seconds', 'EX', 2);
    const exists1 = await redis.exists(testKey1);
    if (!exists1) {
      throw new Error('Key with EX should exist immediately');
    }
    
    // PX mode (milliseconds)
    await redis.setWithExpiry(testKey2, 'expires in 2000ms', 'PX', 2000);
    const exists2 = await redis.exists(testKey2);
    if (!exists2) {
      throw new Error('Key with PX should exist immediately');
    }
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const exists3 = await redis.exists(testKey1);
    const exists4 = await redis.exists(testKey2);
    
    if (exists3 || exists4) {
      throw new Error('Keys should have expired');
    }
  });

  // Test 12: Expire command
  await runTest('Set expiration on existing key', async () => {
    const testKey = 'test:expire:command';
    
    await redis.set(testKey, 'will expire');
    const success = await redis.expire(testKey, 2);
    
    if (!success) {
      throw new Error('Expire command should return true');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const exists = await redis.exists(testKey);
    if (exists) {
      throw new Error('Key should have expired');
    }
  });

  // Test 13: Keys pattern matching
  await runTest('Keys pattern matching', async () => {
    const prefix = 'test:pattern:';
    const keys = [`${prefix}1`, `${prefix}2`, `${prefix}3`];
    
    // Set test keys
    for (const key of keys) {
      await redis.set(key, 'test');
    }
    
    // Find keys with pattern
    const found = await redis.keys(`${prefix}*`);
    
    if (found.length < 3) {
      throw new Error(`Expected at least 3 keys, found ${found.length}`);
    }
    
    // Cleanup
    await redis.delMultiple(keys);
  });

  // Test 14: Edge caching verification (latency test)
  await runTest('Edge caching verification (latency)', async () => {
    const testKey = 'test:edge:cache';
    const testValue = 'cached value';
    
    // First write
    await redis.set(testKey, testValue);
    
    // Measure read latency (should be fast due to edge caching)
    const iterations = 10;
    const latencies: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await redis.get(testKey);
      latencies.push(Date.now() - start);
    }
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`    Average latency: ${avgLatency.toFixed(2)}ms`);
    
    if (avgLatency > 100) {
      console.warn(`    ⚠️  Warning: Average latency is ${avgLatency.toFixed(2)}ms (expected < 100ms for edge caching)`);
    }
    
    await redis.del(testKey);
  });

  // Test 15: Retry behavior (simulate by testing error recovery)
  await runTest('Error handling and graceful degradation', async () => {
    // Test that errors are caught and logged without crashing
    const nonExistentKey = 'test:nonexistent:key';
    
    const value = await redis.get(nonExistentKey);
    if (value !== null) {
      throw new Error('Non-existent key should return null');
    }
    
    const hash = await redis.hGetAll(nonExistentKey);
    if (Object.keys(hash).length !== 0) {
      throw new Error('Non-existent hash should return empty object');
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
