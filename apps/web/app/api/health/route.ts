import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * Returns status of critical services and environment configuration
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  checks: {
    database: boolean;
    redis: boolean;
    inngest: boolean;
    envVars: {
      configured: string[];
      missing: string[];
    };
  };
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_TOKEN',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
  'BLOCKFROST_PROJECT_ID',
  'NFT_POLICY_ID',
  'JWT_SECRET',
  'JWT_ISSUER',
];

export async function GET() {
  try {
    // Check environment variables
    const configured: string[] = [];
    const missing: string[] = [];

    REQUIRED_ENV_VARS.forEach(varName => {
      if (process.env[varName]) {
        configured.push(varName);
      } else {
        missing.push(varName);
      }
    });

    // Check database connection
    let databaseHealthy = false;
    try {
      // Import from services/api database connection
      const { healthCheck } = await import('../../../../../services/api/src/db/connection');
      databaseHealthy = await healthCheck();
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check Redis connection
    let redisHealthy = false;
    try {
      // Redis health check - for now just check if env vars are present
      // Full Redis integration will be tested separately
      redisHealthy = !!(process.env.REDIS_URL && process.env.REDIS_TOKEN);
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    // Check Inngest configuration
    const inngestHealthy = !!(
      process.env.INNGEST_EVENT_KEY && 
      process.env.INNGEST_SIGNING_KEY
    );

    // Determine overall status
    const allEnvVarsPresent = missing.length === 0;
    const allServicesHealthy = databaseHealthy && redisHealthy && inngestHealthy;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allEnvVarsPresent && allServicesHealthy) {
      status = 'healthy';
    } else if (allEnvVarsPresent || (databaseHealthy && redisHealthy)) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      checks: {
        database: databaseHealthy,
        redis: redisHealthy,
        inngest: inngestHealthy,
        envVars: {
          configured,
          missing,
        },
      },
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
