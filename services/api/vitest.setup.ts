/**
 * Vitest setup file for integration tests
 * Sets up test environment variables
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

// Set test environment variables
process.env.NODE_ENV = 'test';
// Don't override DATABASE_URL if it's already set from .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://trivia_admin:local_dev_password@localhost:5432/trivianft_test';
}
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
