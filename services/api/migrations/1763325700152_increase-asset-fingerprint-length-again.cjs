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
  // Increase asset_fingerprint to 150 characters to handle longer asset names
  pgm.alterColumn('player_nfts', 'asset_fingerprint', {
    type: 'varchar(150)',
  });
  
  console.log('✅ Increased asset_fingerprint column to 150 characters');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.alterColumn('player_nfts', 'asset_fingerprint', {
    type: 'varchar(100)',
  });
};
