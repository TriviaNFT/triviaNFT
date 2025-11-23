/**
 * Remove NFT-specific columns from categories table
 * These columns have been migrated to nft_catalog table
 * Categories should only contain category metadata, not NFT data
 * 
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Remove NFT-specific columns - data has been migrated to nft_catalog
  pgm.dropColumn('categories', 'nft_image_ipfs');
  pgm.dropColumn('categories', 'nft_video_ipfs');
  pgm.dropColumn('categories', 'visual_description');
  
  pgm.sql(`
    COMMENT ON TABLE categories IS 'Trivia categories (metadata only - NFT data in nft_catalog)';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Restore columns if needed (data would need to be re-migrated from nft_catalog)
  pgm.addColumn('categories', {
    nft_image_ipfs: {
      type: 'text',
      notNull: false,
    },
  });
  
  pgm.addColumn('categories', {
    nft_video_ipfs: {
      type: 'text',
      notNull: false,
    },
  });
  
  pgm.addColumn('categories', {
    visual_description: {
      type: 'text',
      notNull: false,
    },
  });
};
