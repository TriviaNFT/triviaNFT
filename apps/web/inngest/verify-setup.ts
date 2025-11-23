/**
 * Verification script for Inngest Dev Server setup
 * 
 * This script checks that:
 * 1. Inngest Dev Server is running
 * 2. Next.js dev server is running
 * 3. Workflows are registered
 * 4. Database connection is working
 * 
 * Run: npx tsx apps/web/inngest/verify-setup.ts
 */

import { getPool } from '../../../services/api/src/db/connection';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

/**
 * Check if Inngest Dev Server is running
 */
async function checkInngestDevServer(): Promise<CheckResult> {
  try {
    const response = await fetch('http://localhost:8288');
    if (response.ok) {
      return {
        name: 'Inngest Dev Server',
        status: 'pass',
        message: 'Running at http://localhost:8288',
      };
    } else {
      return {
        name: 'Inngest Dev Server',
        status: 'fail',
        message: `Unexpected response: ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: 'Inngest Dev Server',
      status: 'fail',
      message: `Not running. Start with: npx inngest-cli@latest dev`,
    };
  }
}

/**
 * Check if Next.js dev server is running
 */
async function checkNextJsServer(): Promise<CheckResult> {
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok || response.status === 404) {
      return {
        name: 'Next.js Dev Server',
        status: 'pass',
        message: 'Running at http://localhost:3000',
      };
    } else {
      return {
        name: 'Next.js Dev Server',
        status: 'fail',
        message: `Unexpected response: ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: 'Next.js Dev Server',
      status: 'fail',
      message: 'Not running. Start with: pnpm dev',
    };
  }
}

/**
 * Check if Inngest API endpoint is accessible
 */
async function checkInngestEndpoint(): Promise<CheckResult> {
  try {
    const response = await fetch('http://localhost:3000/api/inngest');
    
    // GET request should return function configurations
    if (response.ok) {
      const data = await response.json();
      
      // Check if workflows are registered
      const hasWorkflows = data && (
        data.functions?.length > 0 || 
        data.workflows?.length > 0 ||
        Array.isArray(data)
      );
      
      if (hasWorkflows) {
        return {
          name: 'Inngest API Endpoint',
          status: 'pass',
          message: 'Accessible and workflows registered',
        };
      } else {
        return {
          name: 'Inngest API Endpoint',
          status: 'warn',
          message: 'Accessible but no workflows found',
        };
      }
    } else {
      return {
        name: 'Inngest API Endpoint',
        status: 'fail',
        message: `Endpoint returned ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: 'Inngest API Endpoint',
      status: 'fail',
      message: `Cannot access /api/inngest: ${error.message}`,
    };
  }
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<CheckResult> {
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT NOW()');
    
    if (result.rows.length > 0) {
      return {
        name: 'Database Connection',
        status: 'pass',
        message: 'Connected successfully',
      };
    } else {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: 'Query returned no results',
      };
    }
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: `Cannot connect: ${error.message}`,
    };
  }
}

/**
 * Check environment variables
 */
async function checkEnvironmentVariables(): Promise<CheckResult> {
  const required = [
    'DATABASE_URL',
    'NFT_POLICY_ID',
    'BLOCKFROST_PROJECT_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length === 0) {
    return {
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required variables set',
    };
  } else {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}`,
    };
  }
}

/**
 * Check if test data exists
 */
async function checkTestData(): Promise<CheckResult> {
  try {
    const pool = await getPool();
    
    // Check for players
    const playersResult = await pool.query('SELECT COUNT(*) FROM players WHERE stake_key IS NOT NULL');
    const playerCount = parseInt(playersResult.rows[0].count);
    
    // Check for categories
    const categoriesResult = await pool.query('SELECT COUNT(*) FROM categories');
    const categoryCount = parseInt(categoriesResult.rows[0].count);
    
    // Check for NFT catalog
    const catalogResult = await pool.query('SELECT COUNT(*) FROM nft_catalog WHERE minted_at IS NULL');
    const availableNFTs = parseInt(catalogResult.rows[0].count);
    
    if (playerCount > 0 && categoryCount > 0 && availableNFTs > 0) {
      return {
        name: 'Test Data',
        status: 'pass',
        message: `${playerCount} players, ${categoryCount} categories, ${availableNFTs} available NFTs`,
      };
    } else {
      const issues = [];
      if (playerCount === 0) issues.push('no players');
      if (categoryCount === 0) issues.push('no categories');
      if (availableNFTs === 0) issues.push('no available NFTs');
      
      return {
        name: 'Test Data',
        status: 'warn',
        message: `Limited test data: ${issues.join(', ')}`,
      };
    }
  } catch (error: any) {
    return {
      name: 'Test Data',
      status: 'fail',
      message: `Cannot check: ${error.message}`,
    };
  }
}

/**
 * Print results
 */
function printResults() {
  console.log('\n🔍 Inngest Setup Verification\n');
  console.log('═'.repeat(60));
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
    const status = result.status.toUpperCase().padEnd(6);
    console.log(`${icon} [${status}] ${result.name}`);
    console.log(`   ${result.message}`);
  }
  
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`\n📊 Summary: ${passed} passed, ${warned} warnings, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('❌ Setup incomplete. Please fix the failed checks above.\n');
    return false;
  } else if (warned > 0) {
    console.log('⚠️  Setup mostly complete. Review warnings above.\n');
    return true;
  } else {
    console.log('✅ Setup complete! You can now test workflows.\n');
    console.log('Next steps:');
    console.log('  1. Run test script: npx tsx apps/web/inngest/test-workflows.ts');
    console.log('  2. Open Inngest Dev UI: http://localhost:8288');
    console.log('  3. Monitor workflow execution in real-time\n');
    return true;
  }
}

/**
 * Main verification
 */
async function main() {
  try {
    // Run all checks
    results.push(await checkInngestDevServer());
    results.push(await checkNextJsServer());
    results.push(await checkInngestEndpoint());
    results.push(await checkEnvironmentVariables());
    results.push(await checkDatabase());
    results.push(await checkTestData());
    
    // Print results
    const success = printResults();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      const pool = await getPool();
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run verification
main();
