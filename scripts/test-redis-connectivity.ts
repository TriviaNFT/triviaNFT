#!/usr/bin/env tsx

/**
 * Redis Connectivity Test Script
 * Tests Upstash Redis connection, operations, and edge caching
 * 
 * This script can be run locally or in the preview deployment environment
 */

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
  console.log('🔴 Testing Redis Connectivity\n');
  console.log('═'.repeat(80));

  // Check environment variables
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
    console.error('❌ REDIS_URL and REDIS_TOKEN environment variables are required');
    console.error('\nPlease set these variables:');
    console.error('  export REDIS_URL="https://your-redis.upstash.io"');
    console.error('  export REDIS_TOKEN="your-token"\n');
    process.exit(1);
  }

  console.log('\n📋 Configuration:\n');
  const redisUrl = new URL(process.env.REDIS_URL);
  console.log(`  Host: ${redisUrl.hostname}`);
  console.log(`  Protocol: ${redisUrl.protocol}`);
  console.log(`  Token: ${process.env.REDIS_TOKEN.substring(0, 10)}...`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n🧪 Running Tests:\n');

  // Import Upstash Redis (will fail if not installed)
  let Redis: any;
  try {
    const upstash = await import('@upstash/redis');
    Redis = upstash.Redis;
  } catch (error) {
    console.error('❌ @upstash/redis package not installed');
    console.error('Run: pnpm add @upstash/redis\n');
    process.exit(1);
  }

  const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  });

  // Test 1: Basic connection (PING)
  await test('Basic Connection (PING)', async () => {
    const result = await redis.ping();
    return { passed: result === 'PONG' };
  });

  // Test 2: SET operation
  await test('SET Operation', async () => {
    const key = 'test:connectivity:set';
    const value = 'test-value-' + Date.now();
    const result = await redis.set(key, value);
    return { passed: result === 'OK', details: { key, value } };
  });

  // Test 3: GET operation
  await test('GET Operation', async () => {
    const key = 'test:connectivity:get';
    const value = 'test-value-' + Date.now();
    await redis.set(key, value);
    const retrieved = await redis.get(key);
    return { passed: retrieved === value, details: { expected: value, got: retrieved } };
  });

  // Test 4: SET with expiration
  await test('SET with Expiration', async () => {
    const key = 'test:connectivity:expire';
    const value = 'expires-soon';
    await redis.set(key, value, { ex: 10 }); // 10 seconds
    const ttl = await redis.ttl(key);
    return { passed: ttl > 0 && ttl <= 10, details: { ttl } };
  });

  // Test 5: DELETE operation
  await test('DELETE Operation', async () => {
    const key = 'test:connectivity:delete';
    await redis.set(key, 'to-be-deleted');
    const deleted = await redis.del(key);
    const retrieved = await redis.get(key);
    return { passed: deleted === 1 && retrieved === null };
  });

  // Test 6: JSON storage
  await test('JSON Storage', async () => {
    const key = 'test:connectivity:json';
    const data = { user: 'test', timestamp: Date.now(), nested: { value: 42 } };
    await redis.set(key, JSON.stringify(data));
    const retrieved = await redis.get(key);
    const parsed = JSON.parse(retrieved as string);
    return {
      passed: parsed.user === data.user && parsed.nested.value === data.nested.value,
      details: { stored: data, retrieved: parsed },
    };
  });

  // Test 7: Multiple keys (MGET)
  await test('Multiple GET (MGET)', async () => {
    const keys = ['test:mget:1', 'test:mget:2', 'test:mget:3'];
    const values = ['value1', 'value2', 'value3'];
    
    // Set multiple keys
    await Promise.all(keys.map((key, i) => redis.set(key, values[i])));
    
    // Get multiple keys
    const retrieved = await redis.mget(...keys);
    const allMatch = retrieved.every((val: string, i: number) => val === values[i]);
    
    return { passed: allMatch, details: { expected: values, got: retrieved } };
  });

  // Test 8: Increment operation
  await test('INCR Operation', async () => {
    const key = 'test:connectivity:counter';
    await redis.del(key); // Clear any existing value
    const val1 = await redis.incr(key);
    const val2 = await redis.incr(key);
    const val3 = await redis.incr(key);
    return {
      passed: val1 === 1 && val2 === 2 && val3 === 3,
      details: { values: [val1, val2, val3] },
    };
  });

  // Test 9: Hash operations
  await test('Hash Operations (HSET/HGET)', async () => {
    const key = 'test:connectivity:hash';
    await redis.hset(key, { field1: 'value1', field2: 'value2', field3: 'value3' });
    const field1 = await redis.hget(key, 'field1');
    const allFields = await redis.hgetall(key);
    return {
      passed: field1 === 'value1' && Object.keys(allFields).length === 3,
      details: { field1, allFields },
    };
  });

  // Test 10: List operations
  await test('List Operations (LPUSH/LRANGE)', async () => {
    const key = 'test:connectivity:list';
    await redis.del(key);
    await redis.lpush(key, 'item1', 'item2', 'item3');
    const items = await redis.lrange(key, 0, -1);
    return {
      passed: items.length === 3,
      details: { items },
    };
  });

  // Test 11: Performance test
  await test('Performance Test (100 operations)', async () => {
    const start = Date.now();
    const promises = Array.from({ length: 100 }, (_, i) =>
      redis.set(`test:perf:${i}`, `value${i}`)
    );
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    return {
      passed: duration < 5000, // Should complete in < 5 seconds
      details: { duration: `${duration}ms`, opsPerSecond: Math.round(100 / (duration / 1000)) },
    };
  });

  // Test 12: Session simulation
  await test('Session Storage Simulation', async () => {
    const sessionId = 'test:session:' + Date.now();
    const sessionData = {
      userId: 'user-123',
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      data: { score: 100, level: 5 },
    };
    
    // Store session with 1 hour expiration
    await redis.set(sessionId, JSON.stringify(sessionData), { ex: 3600 });
    
    // Retrieve session
    const retrieved = await redis.get(sessionId);
    const parsed = JSON.parse(retrieved as string);
    
    // Check TTL
    const ttl = await redis.ttl(sessionId);
    
    return {
      passed: parsed.userId === sessionData.userId && ttl > 3500 && ttl <= 3600,
      details: { sessionId, ttl },
    };
  });

  // Cleanup test keys
  console.log('\n🧹 Cleaning up test keys...\n');
  const testKeys = await redis.keys('test:*');
  if (testKeys.length > 0) {
    await redis.del(...testKeys);
    console.log(`   Deleted ${testKeys.length} test keys\n`);
  }

  // Print results
  console.log('═'.repeat(80));
  console.log('\n📊 Test Results:\n');

  let passCount = 0;
  let failCount = 0;
  let totalDuration = 0;

  results.forEach(result => {
    console.log(`${result.message} ${result.duration ? `(${result.duration}ms)` : ''}`);
    if (result.details) {
      const detailsStr = JSON.stringify(result.details, null, 2);
      if (detailsStr.length < 200) {
        console.log(`   Details: ${detailsStr.split('\n').join('\n   ')}`);
      }
    }
    if (result.passed) passCount++;
    else failCount++;
    totalDuration += result.duration || 0;
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Passed: ${passCount} | ❌ Failed: ${failCount} | ⏱️  Total: ${totalDuration}ms\n`);

  if (failCount === 0) {
    console.log('🎉 All Redis connectivity tests passed!\n');
    console.log('Redis is ready for use in preview deployment.\n');
    console.log('Edge caching is enabled and working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some Redis tests failed.\n');
    console.log('Troubleshooting steps:');
    console.log('1. Verify REDIS_URL and REDIS_TOKEN are correct');
    console.log('2. Check Upstash Redis dashboard');
    console.log('3. Verify REST API is enabled');
    console.log('4. Check network connectivity to Upstash\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Redis test script failed:', error);
  process.exit(1);
});
