/**
 * Migration: Add NFT Naming Convention Fields
 * Description: Add columns to support the new standardized NFT naming convention
 * Requirements: 8.1-8.6
 * 
 * Changes:
 * - Add display_name column to nft_catalog table
 * - Add category_code column to categories table with unique index
 * - Add type_code column to player_nfts table
 * - Update token_name column length to VARCHAR(64) in player_nfts and mints
 * - Populate category_code values for all 10 categories
 * - Migrate existing name values to display_name in nft_catalog
 */

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
  // ============================================================================
  // 1. Add display_name column to nft_catalog table
  // ============================================================================
  pgm.addColumn('nft_catalog', {
    display_name: {
      type: 'VARCHAR(200)',
      notNull: false,
      comment: 'Human-friendly NFT name (e.g., "Quantum Explorer")',
    },
  });

  // Migrate existing name values to display_name
  pgm.sql(`
    UPDATE nft_catalog 
    SET display_name = name 
    WHERE display_name IS NULL;
  `);

  // ============================================================================
  // 2. Add category_code column to categories table
  // ============================================================================
  pgm.addColumn('categories', {
    category_code: {
      type: 'VARCHAR(10)',
      notNull: false,
      comment: 'Short 3-5 character code representing the category (e.g., SCI for Science)',
    },
  });

  // Populate category codes for all 10 categories
  pgm.sql(`
    UPDATE categories SET category_code = 'ARTS' WHERE slug = 'arts';
    UPDATE categories SET category_code = 'ENT' WHERE slug = 'entertainment';
    UPDATE categories SET category_code = 'GEO' WHERE slug = 'geography';
    UPDATE categories SET category_code = 'HIST' WHERE slug = 'history';
    UPDATE categories SET category_code = 'MYTH' WHERE slug = 'mythology';
    UPDATE categories SET category_code = 'NAT' WHERE slug = 'nature';
    UPDATE categories SET category_code = 'SCI' WHERE slug = 'science';
    UPDATE categories SET category_code = 'SPORT' WHERE slug = 'sports';
    UPDATE categories SET category_code = 'TECH' WHERE slug = 'technology';
    UPDATE categories SET category_code = 'WEIRD' WHERE slug = 'weird-wonderful';
  `);

  // Make category_code NOT NULL after populating
  pgm.alterColumn('categories', 'category_code', {
    notNull: true,
  });

  // Create unique index on category_code
  pgm.createIndex('categories', 'category_code', {
    name: 'idx_categories_code',
    unique: true,
  });

  // ============================================================================
  // 3. Add type_code column to player_nfts table
  // ============================================================================
  pgm.addColumn('player_nfts', {
    type_code: {
      type: 'VARCHAR(10)',
      notNull: false,
      comment: 'Tier code: REG, ULT, MAST, or SEAS',
    },
  });

  // Create index on type_code for quick tier filtering
  pgm.createIndex('player_nfts', 'type_code', {
    name: 'idx_player_nfts_type_code',
    where: 'type_code IS NOT NULL',
  });

  // ============================================================================
  // 4. Update token_name column length in player_nfts and mints tables
  // ============================================================================
  // Note: token_name is already VARCHAR(64) in both tables, but we ensure it here
  pgm.alterColumn('player_nfts', 'token_name', {
    type: 'VARCHAR(64)',
    notNull: true,
  });

  pgm.alterColumn('mints', 'token_name', {
    type: 'VARCHAR(64)',
    notNull: false, // Can be null until minting completes
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop indexes
  pgm.dropIndex('player_nfts', 'type_code', { name: 'idx_player_nfts_type_code' });
  pgm.dropIndex('categories', 'category_code', { name: 'idx_categories_code' });

  // Drop columns
  pgm.dropColumn('player_nfts', 'type_code');
  pgm.dropColumn('categories', 'category_code');
  pgm.dropColumn('nft_catalog', 'display_name');

  // Note: We don't revert token_name column type changes as they were already VARCHAR(64)
};
