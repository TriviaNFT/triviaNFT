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
  pgm.createIndex('questions', 'times_used', {
    name: 'idx_questions_times_used'
  });

  // Add composite index for category + usage queries
  pgm.createIndex('questions', ['category_id', 'times_used'], {
    name: 'idx_questions_category_usage'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop indexes first
  pgm.dropIndex('questions', ['category_id', 'times_used'], {
    name: 'idx_questions_category_usage'
  });
  
  pgm.dropIndex('questions', 'times_used', {
    name: 'idx_questions_times_used'
  });

  // Drop column
  pgm.dropColumn('questions', 'times_used');
};
