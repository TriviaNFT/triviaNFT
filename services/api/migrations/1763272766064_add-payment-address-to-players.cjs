/**
 * Add payment_address column to players table
 * This stores the full bech32 Cardano address for receiving NFTs
 */

exports.up = (pgm) => {
  // Add payment_address column
  pgm.addColumn('players', {
    payment_address: {
      type: 'VARCHAR(255)',
      notNull: false,
    },
  });

  // Add index for payment_address lookups
  pgm.createIndex('players', 'payment_address', {
    name: 'idx_players_payment_address',
    where: 'payment_address IS NOT NULL',
  });

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN players.payment_address IS 'Full bech32 Cardano payment address for receiving NFTs';
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('players', 'payment_address', { name: 'idx_players_payment_address' });
  pgm.dropColumn('players', 'payment_address');
};
