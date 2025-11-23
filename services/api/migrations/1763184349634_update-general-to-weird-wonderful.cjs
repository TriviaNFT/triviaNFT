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
  pgm.sql(`
    UPDATE categories 
    SET 
      name = 'Weird & Wonderful',
      slug = 'weird-wonderful',
      description = 'Questions about strange, surprising, and mind-blowing facts from all kinds of topics'
    WHERE slug = 'general';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    UPDATE categories 
    SET 
      name = 'General',
      slug = 'general',
      description = 'General knowledge questions from various topics'
    WHERE slug = 'weird-wonderful';
  `);
};
