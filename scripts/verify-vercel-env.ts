#!/usr/bin/env tsx
/**
 * Vercel Environment Variables Verification Script
 * 
 * This script verifies that all required environment variables are configured
 * for Vercel deployment. Run this before deploying to catch missing variables.
 * 
 * Usage:
 *   tsx scripts/verify-vercel-env.ts
 *   tsx scripts/verify-vercel-env.ts --env production
 *   tsx scripts/verify-vercel-env.ts --env preview
 *   tsx scripts/verify-vercel-env.ts --env development
 */

interface EnvVariable {
  name: string;
  required: boolean;
  sensitive: boolean;
  description: string;
  validation?: (value: string) => boolean;
  example?: string;
}

const REQUIRED_ENV_VARS: EnvVariable[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    sensitive: true,
    description: 'Neon PostgreSQL pooled connection string',
    validation: (val) => val.includes('pooler') && val.includes('postgresql://'),
    example: 'postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require',
  },
  {
    name: 'DATABASE_URL_UNPOOLED',
    required: true,
    sensitive: true,
    description: 'Neon PostgreSQL direct connection string',
    validation: (val) => !val.includes('pooler') && val.includes('postgresql://'),
    example: 'postgresql://user:pass@host.neon.tech/db?sslmode=require',
  },
  
  // Redis
  {
    name: 'REDIS_URL',
    required: true,
    sensitive: false,
    description: 'Upstash Redis REST URL',
    validation: (val) => val.startsWith('https://') && val.includes('upstash.io'),
    example: 'https://endpoint.upstash.io',
  },
  {
    name: 'REDIS_TOKEN',
    required: true,
    sensitive: true,
    description: 'Upstash Redis REST token',
    validation: (val) => val.length > 20,
    example: 'AXlzASQgNzk4YjQ5YTktMGVhZC00NzE5...',
  },
  
  // Inngest
  {
    name: 'INNGEST_EVENT_KEY',
    required: true,
    sensitive: true,
    description: 'Inngest event key for sending events',
    validation: (val) => val.length > 20,
    example: 'DhWVJWVkE-OFHZVAcenzQ5z8PQW64it3...',
  },
  {
    name: 'INNGEST_SIGNING_KEY',
    required: true,
    sensitive: true,
    description: 'Inngest signing key for verifying requests',
    validation: (val) => val.startsWith('signkey-'),
    example: 'signkey-prod-166eac79aab9e423896aae0727d89d1c...',
  },
  
  // Blockchain
  {
    name: 'BLOCKFROST_PROJECT_ID',
    required: true,
    sensitive: true,
    description: 'Blockfrost project ID for Cardano blockchain',
    validation: (val) => val.startsWith('preprod') || val.startsWith('mainnet'),
    example: 'preprodWAuGSqaryUNPRLQw5NmFbL9YgTduoG5y',
  },
  {
    name: 'BLOCKFROST_IPFS_PROJECT_ID',
    required: true,
    sensitive: true,
    description: 'Blockfrost IPFS project ID for asset uploads',
    validation: (val) => val.startsWith('ipfs'),
    example: 'ipfse4BtZvIZjMY0Dxsfv9kbiFSmsmuxNBVx',
  },
  {
    name: 'CARDANO_NETWORK',
    required: true,
    sensitive: false,
    description: 'Cardano network (preprod or mainnet)',
    validation: (val) => val === 'preprod' || val === 'mainnet',
    example: 'preprod',
  },
  {
    name: 'NFT_POLICY_ID',
    required: true,
    sensitive: false,
    description: 'Cardano NFT policy ID',
    validation: (val) => val.length === 56 && /^[a-f0-9]+$/.test(val),
    example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  },
  {
    name: 'PAYMENT_ADDRESS',
    required: true,
    sensitive: false,
    description: 'Cardano payment address for transaction fees',
    validation: (val) => val.startsWith('addr_test1') || val.startsWith('addr1'),
    example: 'addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnr...',
  },
  {
    name: 'WALLET_SEED_PHRASE',
    required: true,
    sensitive: true,
    description: 'Cardano wallet 24-word seed phrase',
    validation: (val) => val.split(' ').length === 24,
    example: 'word1 word2 word3 ... word24',
  },
  {
    name: 'ROYALTY_ADDRESS',
    required: true,
    sensitive: false,
    description: 'Cardano address for NFT royalties',
    validation: (val) => val.startsWith('addr_test1') || val.startsWith('addr1'),
    example: 'addr_test1qqj8u4jl342h835x0mrdefm3fra0cd5ds9aqdcds7k3jnr...',
  },
  {
    name: 'ROYALTY_RATE',
    required: true,
    sensitive: false,
    description: 'NFT royalty rate as decimal',
    validation: (val) => {
      const rate = parseFloat(val);
      return !isNaN(rate) && rate >= 0 && rate <= 1;
    },
    example: '0.025',
  },
  
  // Authentication
  {
    name: 'JWT_SECRET',
    required: true,
    sensitive: true,
    description: 'JWT secret for token signing',
    validation: (val) => val.length >= 32,
    example: 'Xk7mp9Qw2Rt5Yh8Nj3Lp6Vb4Zx1Cd0Fg9Hk2Mn5Pq8Rs',
  },
  {
    name: 'JWT_ISSUER',
    required: true,
    sensitive: false,
    description: 'JWT issuer identifier',
    validation: (val) => val.length > 0,
    example: 'trivia-nft',
  },
];

const OPTIONAL_ENV_VARS: EnvVariable[] = [
  // S3 (optional)
  {
    name: 'S3_BUCKET',
    required: false,
    sensitive: false,
    description: 'AWS S3 bucket name for asset storage',
    example: 'trivia-nft-assets',
  },
  {
    name: 'S3_REGION',
    required: false,
    sensitive: false,
    description: 'AWS S3 region',
    example: 'us-east-1',
  },
  {
    name: 'AWS_ACCESS_KEY_ID',
    required: false,
    sensitive: true,
    description: 'AWS IAM access key',
    validation: (val) => val.length === 20,
    example: 'AKIAIOSFODNN7EXAMPLE',
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    sensitive: true,
    description: 'AWS IAM secret key',
    validation: (val) => val.length === 40,
    example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
  
  // Testing flags
  {
    name: 'MINT_TO_BACKEND_WALLET',
    required: false,
    sensitive: false,
    description: 'Mint NFTs to backend wallet for testing',
    validation: (val) => val === 'true' || val === 'false',
    example: 'false',
  },
];

interface ValidationResult {
  name: string;
  status: 'ok' | 'missing' | 'invalid' | 'warning';
  message: string;
  value?: string;
}

function maskSensitiveValue(value: string, sensitive: boolean): string {
  if (!sensitive) return value;
  if (value.length <= 8) return '***';
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

function validateEnvVar(envVar: EnvVariable): ValidationResult {
  const value = process.env[envVar.name];
  
  if (!value) {
    return {
      name: envVar.name,
      status: envVar.required ? 'missing' : 'warning',
      message: envVar.required 
        ? `❌ Missing required variable: ${envVar.description}`
        : `⚠️  Optional variable not set: ${envVar.description}`,
    };
  }
  
  if (envVar.validation && !envVar.validation(value)) {
    return {
      name: envVar.name,
      status: 'invalid',
      message: `❌ Invalid format: ${envVar.description}`,
      value: maskSensitiveValue(value, envVar.sensitive),
    };
  }
  
  return {
    name: envVar.name,
    status: 'ok',
    message: `✅ ${envVar.description}`,
    value: maskSensitiveValue(value, envVar.sensitive),
  };
}

function checkEnvironmentConsistency(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check network consistency
  const network = process.env.CARDANO_NETWORK;
  const blockfrostId = process.env.BLOCKFROST_PROJECT_ID;
  const paymentAddr = process.env.PAYMENT_ADDRESS;
  
  if (network && blockfrostId) {
    const blockfrostNetwork = blockfrostId.startsWith('mainnet') ? 'mainnet' : 'preprod';
    if (network !== blockfrostNetwork) {
      results.push({
        name: 'NETWORK_CONSISTENCY',
        status: 'invalid',
        message: `❌ Network mismatch: CARDANO_NETWORK=${network} but BLOCKFROST_PROJECT_ID uses ${blockfrostNetwork}`,
      });
    }
  }
  
  if (network && paymentAddr) {
    const addrNetwork = paymentAddr.startsWith('addr1') ? 'mainnet' : 'preprod';
    if (network !== addrNetwork) {
      results.push({
        name: 'ADDRESS_CONSISTENCY',
        status: 'invalid',
        message: `❌ Address mismatch: CARDANO_NETWORK=${network} but PAYMENT_ADDRESS is for ${addrNetwork}`,
      });
    }
  }
  
  // Check database URL consistency
  const dbUrl = process.env.DATABASE_URL;
  const dbUrlUnpooled = process.env.DATABASE_URL_UNPOOLED;
  
  if (dbUrl && dbUrlUnpooled) {
    const pooledHost = dbUrl.match(/@([^/]+)\//)?.[1];
    const unpooledHost = dbUrlUnpooled.match(/@([^/]+)\//)?.[1];
    
    if (pooledHost && unpooledHost) {
      const pooledBase = pooledHost.replace('-pooler', '');
      const unpooledBase = unpooledHost;
      
      if (pooledBase !== unpooledBase) {
        results.push({
          name: 'DATABASE_CONSISTENCY',
          status: 'warning',
          message: `⚠️  Database URLs appear to point to different hosts`,
        });
      }
    }
  }
  
  return results;
}

function printResults(results: ValidationResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('VERCEL ENVIRONMENT VARIABLES VERIFICATION');
  console.log('='.repeat(80) + '\n');
  
  const ok = results.filter(r => r.status === 'ok');
  const missing = results.filter(r => r.status === 'missing');
  const invalid = results.filter(r => r.status === 'invalid');
  const warnings = results.filter(r => r.status === 'warning');
  
  // Print OK variables
  if (ok.length > 0) {
    console.log('✅ CONFIGURED VARIABLES:\n');
    ok.forEach(r => {
      console.log(`  ${r.message}`);
      if (r.value && !r.value.includes('***')) {
        console.log(`     Value: ${r.value}`);
      }
    });
    console.log('');
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(r => {
      console.log(`  ${r.message}`);
    });
    console.log('');
  }
  
  // Print invalid variables
  if (invalid.length > 0) {
    console.log('❌ INVALID VARIABLES:\n');
    invalid.forEach(r => {
      console.log(`  ${r.message}`);
      if (r.value) {
        console.log(`     Current value: ${r.value}`);
      }
    });
    console.log('');
  }
  
  // Print missing variables
  if (missing.length > 0) {
    console.log('❌ MISSING REQUIRED VARIABLES:\n');
    missing.forEach(r => {
      console.log(`  ${r.message}`);
    });
    console.log('');
  }
  
  // Print summary
  console.log('='.repeat(80));
  console.log('SUMMARY:');
  console.log(`  ✅ Configured: ${ok.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);
  console.log(`  ❌ Invalid: ${invalid.length}`);
  console.log(`  ❌ Missing: ${missing.length}`);
  console.log('='.repeat(80) + '\n');
  
  if (missing.length > 0 || invalid.length > 0) {
    console.log('❌ VERIFICATION FAILED');
    console.log('\nPlease configure the missing/invalid variables before deploying.');
    console.log('See VERCEL_ENV_SETUP.md for detailed configuration instructions.\n');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('⚠️  VERIFICATION PASSED WITH WARNINGS');
    console.log('\nOptional variables are not configured. This may be intentional.\n');
    process.exit(0);
  } else {
    console.log('✅ VERIFICATION PASSED');
    console.log('\nAll required environment variables are configured correctly!\n');
    process.exit(0);
  }
}

function main() {
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='));
  const environment = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development';
  
  console.log(`\nVerifying environment variables for: ${environment.toUpperCase()}\n`);
  
  // Validate required variables
  const requiredResults = REQUIRED_ENV_VARS.map(validateEnvVar);
  
  // Validate optional variables
  const optionalResults = OPTIONAL_ENV_VARS.map(validateEnvVar);
  
  // Check consistency
  const consistencyResults = checkEnvironmentConsistency();
  
  // Combine all results
  const allResults = [...requiredResults, ...optionalResults, ...consistencyResults];
  
  // Print results
  printResults(allResults);
}

// Run if executed directly
main();

export { validateEnvVar, checkEnvironmentConsistency };
