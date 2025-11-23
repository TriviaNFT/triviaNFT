#!/usr/bin/env tsx

/**
 * Environment Variables Verification Script
 * Verifies that all required environment variables are accessible
 * 
 * This script should be run in the preview deployment environment
 * Can be executed as a Vercel serverless function or locally with env vars
 */

interface EnvCheck {
  name: string;
  required: boolean;
  present: boolean;
  hasValue: boolean;
  category: string;
}

const REQUIRED_ENV_VARS = [
  // Database
  { name: 'DATABASE_URL', required: true, category: 'Database' },
  { name: 'DATABASE_URL_UNPOOLED', required: false, category: 'Database' },
  
  // Redis
  { name: 'REDIS_URL', required: true, category: 'Redis' },
  { name: 'REDIS_TOKEN', required: true, category: 'Redis' },
  
  // Inngest
  { name: 'INNGEST_EVENT_KEY', required: true, category: 'Inngest' },
  { name: 'INNGEST_SIGNING_KEY', required: true, category: 'Inngest' },
  
  // Blockchain
  { name: 'BLOCKFROST_PROJECT_ID', required: true, category: 'Blockchain' },
  { name: 'NFT_POLICY_ID', required: true, category: 'Blockchain' },
  
  // Authentication
  { name: 'JWT_SECRET', required: true, category: 'Authentication' },
  { name: 'JWT_ISSUER', required: true, category: 'Authentication' },
  
  // Storage (optional - may use S3 or Vercel Blob)
  { name: 'S3_BUCKET', required: false, category: 'Storage' },
  { name: 'S3_REGION', required: false, category: 'Storage' },
  { name: 'AWS_ACCESS_KEY_ID', required: false, category: 'Storage' },
  { name: 'AWS_SECRET_ACCESS_KEY', required: false, category: 'Storage' },
  
  // Vercel-specific
  { name: 'VERCEL_ENV', required: false, category: 'Vercel' },
  { name: 'VERCEL_URL', required: false, category: 'Vercel' },
];

function checkEnvironmentVariables(): EnvCheck[] {
  return REQUIRED_ENV_VARS.map(({ name, required, category }) => {
    const value = process.env[name];
    return {
      name,
      required,
      present: value !== undefined,
      hasValue: !!value && value.length > 0,
      category,
    };
  });
}

function printResults(checks: EnvCheck[]) {
  console.log('🔍 Environment Variables Verification\n');
  console.log('═'.repeat(80));
  
  // Group by category
  const categories = [...new Set(checks.map(c => c.category))];
  
  categories.forEach(category => {
    console.log(`\n📦 ${category}:\n`);
    
    const categoryChecks = checks.filter(c => c.category === category);
    categoryChecks.forEach(check => {
      const status = check.hasValue 
        ? '✅' 
        : check.required 
          ? '❌' 
          : '⚠️';
      
      const requiredLabel = check.required ? '(required)' : '(optional)';
      const valueStatus = check.hasValue 
        ? 'Set' 
        : check.present 
          ? 'Empty' 
          : 'Missing';
      
      console.log(`  ${status} ${check.name.padEnd(30)} ${requiredLabel.padEnd(12)} ${valueStatus}`);
    });
  });
  
  console.log('\n' + '═'.repeat(80));
  
  // Summary
  const requiredChecks = checks.filter(c => c.required);
  const requiredMissing = requiredChecks.filter(c => !c.hasValue);
  const optionalChecks = checks.filter(c => !c.required);
  const optionalMissing = optionalChecks.filter(c => !c.hasValue);
  
  console.log('\n📊 Summary:\n');
  console.log(`  Required variables: ${requiredChecks.length - requiredMissing.length}/${requiredChecks.length} configured`);
  console.log(`  Optional variables: ${optionalChecks.length - optionalMissing.length}/${optionalChecks.length} configured`);
  
  if (requiredMissing.length > 0) {
    console.log('\n❌ Missing required variables:');
    requiredMissing.forEach(check => {
      console.log(`  - ${check.name}`);
    });
  }
  
  if (optionalMissing.length > 0) {
    console.log('\n⚠️  Missing optional variables:');
    optionalMissing.forEach(check => {
      console.log(`  - ${check.name}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  
  return requiredMissing.length === 0;
}

function printVercelInstructions() {
  console.log('\n📝 To configure environment variables:\n');
  console.log('For local development:');
  console.log('  1. Copy .env.local.example to .env.local');
  console.log('  2. Fill in the required values');
  console.log('  3. See VERCEL_SETUP.md for detailed setup instructions\n');
  console.log('For Vercel deployments:');
  console.log('  1. Go to https://vercel.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Go to Settings → Environment Variables');
  console.log('  4. Add each missing variable');
  console.log('  5. Select appropriate environments (Preview, Production)');
  console.log('  6. Redeploy to apply changes\n');
  console.log('📖 For complete setup instructions, see: VERCEL_SETUP.md\n');
}

function main() {
  const checks = checkEnvironmentVariables();
  const allRequiredPresent = printResults(checks);
  
  if (!allRequiredPresent) {
    printVercelInstructions();
    console.log('❌ Environment variable verification failed\n');
    process.exit(1);
  } else {
    console.log('\n✅ All required environment variables are configured!\n');
    process.exit(0);
  }
}

// Allow this to be imported or run directly
if (require.main === module) {
  main();
}

export { checkEnvironmentVariables, REQUIRED_ENV_VARS };
