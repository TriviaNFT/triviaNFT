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
  // Increase asset_fingerprint column in mints table to 150 characters
  pgm.alterColumn('mints', 'asset_fingerprint', {
    type: 'varchar(150)',
  });
  console.log('✅ Increased mints.asset_fingerprint column to 150 characters');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.alterColumn('mints', 'asset_fingerprint', {
    type: 'varchar(100)',
  });
};
