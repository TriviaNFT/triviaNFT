/**
 * Database Module
 * 
 * Exports database connection utilities and migration functions.
 */

export {
  getPool,
  query,
  transaction,
  closePool,
  healthCheck,
  getStats,
} from './connection.js';

export {
  runMigrations,
} from './migrate.js';

export {
  handler as migrationLambdaHandler,
} from './migration-lambda.js';
