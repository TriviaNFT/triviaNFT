#!/usr/bin/env tsx

/**
 * Production Environment Verification Script
 * 
 * This script verifies that all required environment variables are configured
 * correctly for production deployment.
 * 
 * Usage:
 *   tsx scripts/verify-production-env.ts
 * 
 * Requirements:
 *   - All production environment variables must be set
 *   - Values must be production-ready (mainnet, strong secrets)
 *   - No development/preview values in production
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.production.local') });

interface ValidationResult {
  variable: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

function checkVariable(
  name: string,
  required: boolean = true,
  validator?: (value: string) => { valid: boolean; message?: string }
): void {
  const value = process.env[name];

  if (!value) {
    if (required) {
      results.push({
        variable: name,
        status: 'fail',
        message: 'Missing required variable',
      });
    } else {
      results.push({
        variable: name,
        status: 'warning',
        message: 'Optional variable not set',
      });
    }
    return;
  }

  if (validator) {
    const validation = validator(value);
    if (!validation.valid) {
      results.push({
        variable: name,
        status: 'fail',
        message: validation.message || 'Invalid value',
      });
      return;
    }
  }

  results.push({
    variable: name,
    status: 'pass',
    message: 'Configured correctly',
  });
}

console.log('🔍 Verifying Production Environment Configuration...\n');

// Database Variables
console.log('📊 Database Configuration:');
checkVariable('DATABASE_URL', true, (value) => {
  if (!value.includes('-pooler')) {
    return {
      valid: false,
      message: 'Must use pooled connection (include -pooler in hostname)',
    };
  }
  if (!value.includes('sslmode=require')) {
    return {
      valid: false,
      message: 'Must include sslmode=require for SSL',
    };
  }
  if (value.includes('localhost')) {
    return {
      valid: false,
      message: 'Cannot use localhost in production',
    };
  }
  return { valid: true };
});

checkVariable('DATABASE_URL_UNPOOLED', true, (value) => {
  if (value.includes('-pooler')) {
    return {
      valid: false,
      message: 'Must use direct connection (no -pooler in hostname)',
    };
  }
  if (!value.includes('sslmode=require')) {
    return {
      valid: false,
      message: 'Must include sslmode=require for SSL',
    };
  }
  if (value.includes('localhost')) {
    return {
      valid: false,
      message: 'Cannot use localhost in production',
    };
  }
  return { valid: true };
});

// Redis Variables
console.log('\n🔴 Redis Configuration:');
checkVariable('REDIS_URL', true, (value) => {
  if (!value.startsWith('https://')) {
    return {
      valid: false,
      message: 'Must use HTTPS URL for Upstash REST API',
    };
  }
  if (value.includes('localhost')) {
    return {
      valid: false,
      message: 'Cannot use localhost in production',
    };
  }
  return { valid: true };
});

checkVariable('REDIS_TOKEN', true, (value) => {
  if (value.length < 20) {
    return {
      valid: false,
      message: 'Token appears too short (should be long alphanumeric string)',
    };
  }
  if (value === 'local-dev-token' || value.includes('test')) {
    return {
      valid: false,
      message: 'Cannot use development token in production',
    };
  }
  return { valid: true };
});

// Inngest Variables
console.log('\n⚡ Inngest Configuration:');
checkVariable('INNGEST_EVENT_KEY', true, (value) => {
  if (value.length < 20) {
    return {
      valid: false,
      message: 'Event key appears too short',
    };
  }
  if (value.includes('dev') || value.includes('test')) {
    return {
      valid: false,
      message: 'Cannot use development key in production',
    };
  }
  return { valid: true };
});

checkVariable('INNGEST_SIGNING_KEY', true, (value) => {
  if (!value.startsWith('signkey-prod-')) {
    return {
      valid: false,
      message: 'Must start with signkey-prod- for production',
    };
  }
  if (value.length < 30) {
    return {
      valid: false,
      message: 'Signing key appears too short',
    };
  }
  return { valid: true };
});

// Blockchain Variables
console.log('\n⛓️  Blockchain Configuration:');
checkVariable('BLOCKFROST_PROJECT_ID', true, (value) => {
  if (!value.startsWith('mainnet')) {
    return {
      valid: false,
      message: 'Must use mainnet project ID for production (starts with "mainnet")',
    };
  }
  if (value.startsWith('preprod')) {
    return {
      valid: false,
      message: 'Cannot use preprod (testnet) in production',
    };
  }
  return { valid: true };
});

checkVariable('BLOCKFROST_IPFS_PROJECT_ID', true, (value) => {
  if (!value.startsWith('ipfs')) {
    return {
      valid: false,
      message: 'Must start with "ipfs"',
    };
  }
  return { valid: true };
});

checkVariable('CARDANO_NETWORK', true, (value) => {
  if (value !== 'mainnet') {
    return {
      valid: false,
      message: 'Must be "mainnet" for production',
    };
  }
  return { valid: true };
});

checkVariable('NFT_POLICY_ID', true, (value) => {
  if (value.length !== 56) {
    return {
      valid: false,
      message: 'Must be exactly 56 characters (hex string)',
    };
  }
  if (!/^[a-f0-9]{56}$/.test(value)) {
    return {
      valid: false,
      message: 'Must be hexadecimal string (lowercase a-f, 0-9)',
    };
  }
  return { valid: true };
});

checkVariable('PAYMENT_ADDRESS', true, (value) => {
  if (!value.startsWith('addr1')) {
    return {
      valid: false,
      message: 'Must start with "addr1" for mainnet (not addr_test1)',
    };
  }
  if (value.startsWith('addr_test1')) {
    return {
      valid: false,
      message: 'Cannot use testnet address (addr_test1) in production',
    };
  }
  return { valid: true };
});

checkVariable('WALLET_SEED_PHRASE', true, (value) => {
  const words = value.trim().split(/\s+/);
  if (words.length !== 24) {
    return {
      valid: false,
      message: `Must be exactly 24 words (found ${words.length})`,
    };
  }
  if (value.includes('test') || value.includes('example')) {
    return {
      valid: false,
      message: 'Cannot use test/example seed phrase in production',
    };
  }
  return { valid: true };
});

checkVariable('ROYALTY_ADDRESS', true, (value) => {
  if (!value.startsWith('addr1')) {
    return {
      valid: false,
      message: 'Must start with "addr1" for mainnet',
    };
  }
  return { valid: true };
});

checkVariable('ROYALTY_RATE', true, (value) => {
  const rate = parseFloat(value);
  if (isNaN(rate)) {
    return {
      valid: false,
      message: 'Must be a valid decimal number',
    };
  }
  if (rate < 0 || rate > 1) {
    return {
      valid: false,
      message: 'Must be between 0 and 1 (e.g., 0.025 for 2.5%)',
    };
  }
  if (rate > 0.15) {
    return {
      valid: false,
      message: 'Royalty rate seems high (>15%), verify this is correct',
    };
  }
  return { valid: true };
});

// Authentication Variables
console.log('\n🔐 Authentication Configuration:');
checkVariable('JWT_SECRET', true, (value) => {
  if (value.length < 32) {
    return {
      valid: false,
      message: 'Must be at least 32 characters for security',
    };
  }
  if (
    value === 'local-dev-secret-change-in-production' ||
    value.includes('dev') ||
    value.includes('test')
  ) {
    return {
      valid: false,
      message: 'Cannot use development secret in production',
    };
  }
  return { valid: true };
});

checkVariable('JWT_ISSUER', true, (value) => {
  if (value.length === 0) {
    return {
      valid: false,
      message: 'Must not be empty',
    };
  }
  return { valid: true };
});

// Optional S3 Variables
console.log('\n☁️  AWS S3 Configuration (Optional):');
checkVariable('S3_BUCKET', false);
checkVariable('S3_REGION', false);
checkVariable('AWS_ACCESS_KEY_ID', false, (value) => {
  if (value.length < 16) {
    return {
      valid: false,
      message: 'Access key appears too short',
    };
  }
  return { valid: true };
});
checkVariable('AWS_SECRET_ACCESS_KEY', false, (value) => {
  if (value.length < 32) {
    return {
      valid: false,
      message: 'Secret key appears too short',
    };
  }
  return { valid: true };
});

// Production Flags
console.log('\n🚩 Production Flags:');
checkVariable('MINT_TO_BACKEND_WALLET', false, (value) => {
  if (value === 'true') {
    return {
      valid: false,
      message: 'Should be "false" in production (mint to user wallet)',
    };
  }
  return { valid: true };
});

// Print Results
console.log('\n' + '='.repeat(80));
console.log('📋 Verification Results:\n');

const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const warnings = results.filter((r) => r.status === 'warning').length;

results.forEach((result) => {
  const icon =
    result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.variable}`);
  if (result.status !== 'pass') {
    console.log(`   ${result.message}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log(`   📝 Total: ${results.length}`);

if (failed > 0) {
  console.log('\n❌ Production environment is NOT ready for deployment!');
  console.log('   Please fix the failed checks above before deploying.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Production environment has warnings.');
  console.log('   Review optional variables and ensure they are configured if needed.\n');
  process.exit(0);
} else {
  console.log('\n✅ Production environment is ready for deployment!\n');
  process.exit(0);
}
