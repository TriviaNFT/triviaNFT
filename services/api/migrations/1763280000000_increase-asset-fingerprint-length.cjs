/**
 * Migration: Increase asset_fingerprint column length
 * 
 * The asset_fingerprint in the mints table was set to VARCHAR(44)
 * but the actual Cardano asset unit (policyId + assetNameHex) is 82 characters.
 * This migration increases it to VARCHAR(100) to accommodate the full unit.
 */

exports.up = (pgm) => {
  // Increase asset_fingerprint column length in mints table
  pgm.alterColumn('mints', 'asset_fingerprint', {
    type: 'VARCHAR(100)',
  });
  
  console.log('✅ Increased asset_fingerprint column to VARCHAR(100)');
};

exports.down = (pgm) => {
  // Revert back to original size (though this may fail if data exists)
  pgm.alterColumn('mints', 'asset_fingerprint', {
    type: 'VARCHAR(44)',
  });
};
