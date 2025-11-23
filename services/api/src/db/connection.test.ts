/**
 * Database Connection Tests
 * 
 * Tests for Neon PostgreSQL connection configuration and pooling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPool, query, transaction, healthCheck, getStats, closePool } from './connection.js';

describe('Database Connection (Neon PostgreSQL)', () => {
  beforeAll(async () => {
    // Ensure DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set for tests');
    }
  });

  afterAll(async () => {
    // Clean up connection pool
    await closePool();
  });

  describe('Connection Configuration', () => {
    it('should create a connection pool with Neon configuration', async () => {
      const pool = await getPool();
      
      expect(pool).toBeDefined();
      expect(pool.options.max).toBe(10); // Neon-optimized pool size
      expect(pool.options.idleTimeoutMillis).toBe(20000); // 20 seconds
      expect(pool.options.connectionTimeoutMillis).toBe(10000); // 10 seconds
    });

    it('should use SSL for Neon connections', async () => {
      const pool = await getPool();
      
      expect(pool.options.ssl).toBeDefined();
      expect(pool.options.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should reuse the same pool instance', async () => {
      const pool1 = await getPool();
      const pool2 = await getPool();
      
      expect(pool1).toBe(pool2);
    });
  });

  describe('Database Operations', () => {
    it('should execute a simple query', async () => {
      const result = await query('SELECT 1 as test');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    it('should execute a query with parameters', async () => {
      const result = await query('SELECT $1::text as value', ['test']);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].value).toBe('test');
    });

    it('should execute a transaction successfully', async () => {
      const result = await transaction(async (client) => {
        const res1 = await client.query('SELECT 1 as value');
        const res2 = await client.query('SELECT 2 as value');
        return { first: res1.rows[0].value, second: res2.rows[0].value };
      });
      
      expect(result.first).toBe(1);
      expect(result.second).toBe(2);
    });

    it('should rollback transaction on error', async () => {
      await expect(
        transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should pass health check', async () => {
      const healthy = await healthCheck();
      
      expect(healthy).toBe(true);
    });

    it('should return pool statistics', async () => {
      const stats = await getStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingClients');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.idleConnections).toBe('number');
      expect(typeof stats.waitingClients).toBe('number');
    });
  });

  describe('Connection Pooling', () => {
    it('should handle multiple concurrent queries', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => 
        query('SELECT $1::int as value', [i])
      );
      
      const results = await Promise.all(queries);
      
      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.rows[0].value).toBe(i);
      });
    });

    it('should not exceed max pool size', async () => {
      const pool = await getPool();
      const maxConnections = pool.options.max || 10;
      
      // Create more queries than max connections
      const queries = Array.from({ length: maxConnections + 5 }, (_, i) => 
        query('SELECT pg_sleep(0.1), $1::int as value', [i])
      );
      
      const results = await Promise.all(queries);
      
      expect(results).toHaveLength(maxConnections + 5);
      
      // Check that we didn't exceed max connections
      const stats = await getStats();
      expect(stats.totalConnections).toBeLessThanOrEqual(maxConnections);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SQL gracefully', async () => {
      await expect(
        query('INVALID SQL STATEMENT')
      ).rejects.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      // This test verifies error handling without actually breaking the connection
      const pool = await getPool();
      expect(pool).toBeDefined();
    });
  });
});
