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
  // Add emoji icons to all categories for better visual recognition
  pgm.sql(`
    UPDATE categories SET icon_url = '🧬' WHERE slug = 'science';
    UPDATE categories SET icon_url = '📜' WHERE slug = 'history';
    UPDATE categories SET icon_url = '🎨' WHERE slug = 'arts';
    UPDATE categories SET icon_url = '🌍' WHERE slug = 'geography';
    UPDATE categories SET icon_url = '🎬' WHERE slug = 'entertainment';
    UPDATE categories SET icon_url = '💻' WHERE slug = 'technology';
    UPDATE categories SET icon_url = '⚽' WHERE slug = 'sports';
    UPDATE categories SET icon_url = '⚡' WHERE slug = 'mythology';
    UPDATE categories SET icon_url = '🌳' WHERE slug = 'nature';
    UPDATE categories SET icon_url = '❓' WHERE slug = 'weird-wonderful';
    UPDATE categories SET icon_url = '📚' WHERE slug = 'literature';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Remove icons
  pgm.sql(`
    UPDATE categories SET icon_url = NULL;
  `);
};
