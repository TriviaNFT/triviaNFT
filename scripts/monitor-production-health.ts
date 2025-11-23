#!/usr/bin/env tsx

/**
 * Production Health Monitoring Script
 * 
 * This script continuously monitors the production deployment health
 * by checking key endpoints and services.
 * 
 * Usage:
 *   npx tsx scripts/monitor-production-health.ts
 * 
 * Environment Variables:
 *   PRODUCTION_URL - Production URL (default: from user input)
 *   CHECK_INTERVAL - Check interval in seconds (default: 60)
 */

import { setTimeout } from 'timers/promises';

interface HealthCheckResult {
  timestamp: string;
  status: number;
  ok: boolean;
  services: {
    database?: string;
    redis?: string;
    inngest?: string;
  };
  responseTime: number;
  error?: string;
}

const PRODUCTION_URL = process.env.PRODUCTION_URL;
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60') * 1000;

async function checkHealth(url: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    return {
      timestamp: new Date().toISOString(),
      status: response.status,
      ok: response.ok,
      services: {
        database: data.database,
        redis: data.redis,
        inngest: data.inngest,
      },
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      timestamp: new Date().toISOString(),
      status: 0,
      ok: false,
      services: {},
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkInngestEndpoint(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(`${url}/api/inngest`, {
      method: 'GET',
    });
    
    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatHealthResult(result: HealthCheckResult): string {
  const statusIcon = result.ok ? '✅' : '❌';
  const lines = [
    `${statusIcon} [${result.timestamp}] Health Check`,
    `   Status: ${result.status} ${result.ok ? 'OK' : 'FAILED'}`,
    `   Response Time: ${result.responseTime}ms`,
  ];
  
  if (result.services.database) {
    lines.push(`   Database: ${result.services.database}`);
  }
  if (result.services.redis) {
    lines.push(`   Redis: ${result.services.redis}`);
  }
  if (result.services.inngest) {
    lines.push(`   Inngest: ${result.services.inngest}`);
  }
  
  if (result.error) {
    lines.push(`   Error: ${result.error}`);
  }
  
  return lines.join('\n');
}

async function runSingleCheck(url: string): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('Running Production Health Check');
  console.log('='.repeat(80));
  
  // Check health endpoint
  console.log('\n1. Checking Health Endpoint...');
  const healthResult = await checkHealth(url);
  console.log(formatHealthResult(healthResult));
  
  // Check Inngest endpoint
  console.log('\n2. Checking Inngest Endpoint...');
  const inngestResult = await checkInngestEndpoint(url);
  const inngestIcon = inngestResult.ok ? '✅' : '❌';
  console.log(`${inngestIcon} Inngest: ${inngestResult.status} ${inngestResult.ok ? 'OK' : 'FAILED'}`);
  if (inngestResult.error) {
    console.log(`   Error: ${inngestResult.error}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  const allOk = healthResult.ok && inngestResult.ok;
  if (allOk) {
    console.log('✅ All systems operational');
  } else {
    console.log('❌ Some systems are experiencing issues');
  }
  console.log('='.repeat(80) + '\n');
}

async function runContinuousMonitoring(url: string): Promise<void> {
  console.log('Starting Production Health Monitoring');
  console.log(`URL: ${url}`);
  console.log(`Interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log('Press Ctrl+C to stop\n');
  
  let checkCount = 0;
  let successCount = 0;
  let failureCount = 0;
  
  while (true) {
    checkCount++;
    
    const healthResult = await checkHealth(url);
    console.log(formatHealthResult(healthResult));
    
    if (healthResult.ok) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Show statistics every 10 checks
    if (checkCount % 10 === 0) {
      const successRate = ((successCount / checkCount) * 100).toFixed(2);
      console.log(`\n📊 Statistics: ${checkCount} checks, ${successCount} success, ${failureCount} failures (${successRate}% success rate)\n`);
    }
    
    await setTimeout(CHECK_INTERVAL);
  }
}

async function main() {
  let url = PRODUCTION_URL;
  
  // If no URL provided, prompt user
  if (!url) {
    console.log('Production Health Monitoring Script');
    console.log('====================================\n');
    console.log('Please provide your production URL:');
    console.log('Example: https://your-app.vercel.app\n');
    
    // Read from stdin
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    url = await new Promise<string>((resolve) => {
      rl.question('Production URL: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (!url) {
      console.error('Error: Production URL is required');
      process.exit(1);
    }
  }
  
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  
  // Ask for monitoring mode
  console.log('\nMonitoring Mode:');
  console.log('1. Single check (run once)');
  console.log('2. Continuous monitoring (run every minute)');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const mode = await new Promise<string>((resolve) => {
    rl.question('\nSelect mode (1 or 2): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
  
  if (mode === '1') {
    await runSingleCheck(url);
  } else if (mode === '2') {
    await runContinuousMonitoring(url);
  } else {
    console.error('Invalid mode selected');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
