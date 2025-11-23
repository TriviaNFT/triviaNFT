/**
 * Vitest Setup File
 * 
 * This file runs before all tests to set up the test environment.
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
config({ path: path.resolve(__dirname, '.env.test') });

// Also load from services/api/.env.local as fallback
config({ path: path.resolve(__dirname, '../../services/api/.env.local') });

// Ensure critical environment variables are set
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_TOKEN',
  'JWT_SECRET',
  'JWT_ISSUER',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
  console.warn('Tests requiring these variables may fail.');
}

// Set default values for optional variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'trivia-nft';

console.log('✅ Test environment configured');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   REDIS_URL:', process.env.REDIS_URL ? '✓ Set' : '✗ Missing');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');
