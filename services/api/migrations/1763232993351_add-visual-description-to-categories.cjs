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
  // Add visual_description column to store what the NFT image represents
  pgm.addColumn('categories', {
    visual_description: {
      type: 'text',
      notNull: false,
      comment: 'Description of what the NFT visual represents (e.g., "DNA Helix", "Ancient Scroll")',
    },
  });

  // Add default visual descriptions for existing categories
  pgm.sql(`
    UPDATE categories SET visual_description = 'a golden DNA helix symbolizing the mastery of scientific knowledge' WHERE slug = 'science';
    UPDATE categories SET visual_description = 'an ancient scroll and hourglass representing timeless wisdom of historical knowledge' WHERE slug = 'history';
    UPDATE categories SET visual_description = 'a golden quill and palette celebrating mastery of creative and literary arts' WHERE slug = 'arts-literature';
    UPDATE categories SET visual_description = 'a golden globe representing comprehensive knowledge of world geography' WHERE slug = 'geography';
    UPDATE categories SET visual_description = 'a golden film reel and star celebrating mastery of pop culture and entertainment' WHERE slug = 'entertainment';
    UPDATE categories SET visual_description = 'a golden circuit board representing mastery of technological innovation' WHERE slug = 'technology';
    UPDATE categories SET visual_description = 'a golden trophy and laurel wreath celebrating athletic knowledge and achievement' WHERE slug = 'sports';
    UPDATE categories SET visual_description = 'a golden trident and lightning bolt representing mastery of mythological lore' WHERE slug = 'mythology';
    UPDATE categories SET visual_description = 'a golden tree of life symbolizing deep understanding of the natural world' WHERE slug = 'nature';
    UPDATE categories SET visual_description = 'a golden question mark with mystical elements celebrating knowledge of the unusual and extraordinary' WHERE slug = 'weird-wonderful';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumn('categories', 'visual_description');
};
