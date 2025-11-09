/**
 * Database Connection Utility
 * 
 * Provides connection pooling and query helpers for PostgreSQL database.
 * Supports both direct connections and RDS Proxy connections.
 */

import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

interface DatabaseSecret {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
  proxyEndpoint?: string;
}

let poolInstance: Pool | null = null;
let secretsCache: Map<string, { value: DatabaseSecret; expiresAt: number }> = new Map();

/**
 * Get database credentials from Secrets Manager with caching
 */
async function getSecretValue(secretArn: string): Promise<DatabaseSecret> {
  // Check cache first (5 minute TTL)
  const cached = secretsCache.get(secretArn);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = new SecretsManagerClient({});
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretArn,
      })
    );

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const secret: DatabaseSecret = JSON.parse(response.SecretString);
    
    // Cache for 5 minutes
    secretsCache.set(secretArn, {
      value: secret,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    
    return secret;
  } catch (error) {
    console.error('Error retrieving database credentials:', error);
    throw error;
  }
}

/**
 * Get database configuration from environment or Secrets Manager
 */
async function getDatabaseConfig(): Promise<DatabaseConfig> {
  // If DATABASE_URL is set (local development), use it
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require',
    };
  }

  // Otherwise, get from Secrets Manager
  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DATABASE_URL or DATABASE_SECRET_ARN must be set');
  }

  const secret = await getSecretValue(secretArn);
  
  // Use RDS Proxy endpoint if available, otherwise direct connection
  const host = secret.proxyEndpoint || secret.host;
  
  return {
    host,
    port: secret.port,
    database: secret.dbname,
    user: secret.username,
    password: secret.password,
    ssl: process.env.NODE_ENV === 'production',
  };
}

/**
 * Get or create database connection pool
 */
export async function getPool(): Promise<Pool> {
  if (poolInstance) {
    return poolInstance;
  }

  const config = await getDatabaseConfig();
  
  poolInstance = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 20, // Maximum connections per Lambda instance
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000, // 30 second query timeout
  });

  // Handle pool errors
  poolInstance.on('error', (err: Error) => {
    console.error('Unexpected database pool error:', err);
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
