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
  // Add mint_operation_id column to player_nfts table
  pgm.addColumn('player_nfts', {
    mint_operation_id: {
      type: 'uuid',
      references: 'mints(id)',
      onDelete: 'SET NULL',
      comment: 'Reference to the mint operation that created this NFT',
    },
  });

  // Add index for faster lookups
  pgm.createIndex('player_nfts', 'mint_operation_id', {
    name: 'idx_player_nfts_mint_operation',
  });

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN player_nfts.mint_operation_id IS 
    'Links NFT to the mint operation that created it (for traceability and idempotency)';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Remove index first
  pgm.dropIndex('player_nfts', 'mint_operation_id', {
    name: 'idx_player_nfts_mint_operation',
  });

  // Remove column
  pgm.dropColumn('player_nfts', 'mint_operation_id');
};
