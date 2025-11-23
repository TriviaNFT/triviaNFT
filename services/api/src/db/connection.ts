/**
 * Database Connection Utility
 * 
 * Provides connection pooling and query helpers for PostgreSQL database.
 * Optimized for Neon PostgreSQL with serverless connection pooling.
 * Supports both pooled connections (for Vercel Functions) and direct connections (for migrations).
 */

import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';

interface DatabaseConfig {
  connectionString: string;
  ssl: boolean;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

let poolInstance: Pool | null = null;

/**
 * Get database configuration optimized for Neon PostgreSQL
 * 
 * Neon-specific optimizations:
 * - Uses connection pooling via Neon's pooler endpoint (-pooler suffix)
 * - SSL is always enabled for Neon connections
 * - Smaller pool size (10) optimized for serverless functions
 * - Shorter idle timeout (20s) to release connections quickly
 */
function getDatabaseConfig(): DatabaseConfig {
  // DATABASE_URL should point to Neon's pooled connection string
  // Format: postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable must be set');
  }

  // Validate that we're using a Neon connection string
  if (!connectionString.includes('neon.tech') && process.env.NODE_ENV === 'production') {
    console.warn('Warning: DATABASE_URL does not appear to be a Neon connection string');
  }

  // Check if using pooled connection (recommended for serverless)
  const isPooled = connectionString.includes('-pooler.');
  if (!isPooled && process.env.NODE_ENV === 'production') {
    console.warn('Warning: Using direct Neon connection instead of pooled connection. Consider using the pooled endpoint for better performance.');
  }

  return {
    connectionString,
    ssl: true, // Always use SSL for Neon
    max: 10, // Smaller pool size for serverless (Neon handles pooling)
    idleTimeoutMillis: 20000, // 20 seconds - release idle connections quickly
    connectionTimeoutMillis: 10000, // 10 seconds - fail fast if can't connect
  };
}

/**
 * Get or create database connection pool
 * 
 * For Neon PostgreSQL:
 * - Uses pooled connection string (via Neon's connection pooler)
 * - SSL is always enabled
 * - Optimized pool settings for serverless environments
 * - Connection pooling is handled by Neon's infrastructure
 */
export async function getPool(): Promise<Pool> {
  if (poolInstance) {
    return poolInstance;
  }

  const config = getDatabaseConfig();
  
  poolInstance = new Pool({
    connectionString: config.connectionString,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    statement_timeout: 30000, // 30 second query timeout
  });

  // Handle pool errors
  poolInstance.on('error', (err: Error) => {
    console.error('Unexpected database pool error:', err);
  });

  // Log connection info (without credentials)
  const urlObj = new URL(config.connectionString);
  console.log('Database pool initialized:', {
    host: urlObj.hostname,
    database: urlObj.pathname.slice(1),
    ssl: config.ssl,
    maxConnections: config.max,
    isNeonPooled: urlObj.hostname.includes('-pooler.'),
  });

  return poolInstance;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = await getPool();
  
  try {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn('Slow query detected:', {
        duration,
        text: text.substring(0, 100),
        rowCount: result.rowCount,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      error,
      text: text.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 * Should be called when Lambda container is shutting down
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

/**
 * Health check - verify database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<{
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}> {
  const pool = await getPool();
  
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
  };
}
