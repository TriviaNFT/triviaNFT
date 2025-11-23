/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Add times_used column to track how many times each question has been used
  pgm.addColumn('questions', {
    times_used: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times this question has been used in sessions'
    }
  });

  // Add index for efficient sorting by usage
  pgm.createIndex('questions', 'times_used');

  // Add last_used_at column to track when question was last used
  pgm.addColumn('questions', {
    last_used_at: {
      type: 'timestamp',
      notNull: false,
      comment: 'Timestamp when this question was last used in a session'
    }
  });

  // Add index for efficient queries on last_used_at
  pgm.createIndex('questions', 'last_used_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Remove indexes
  pgm.dropIndex('questions', 'last_used_at');
  pgm.dropIndex('questions', 'times_used');
  
  // Remove columns
  pgm.dropColumn('questions', 'last_used_at');
  pgm.dropColumn('questions', 'times_used');
};
