-- Fix asset fingerprint column length in forge_operations table
-- The asset fingerprint (policyId + assetNameHex) can be up to 120 characters
-- Current limit of 44 is too small

ALTER TABLE forge_operations 
ALTER COLUMN output_asset_fingerprint TYPE VARCHAR(120);

-- Add comment explaining the column
COMMENT ON COLUMN forge_operations.output_asset_fingerprint IS 
'Full asset unit (policyId + assetNameHex) of the minted Ultimate NFT. Max 120 chars (56 char policy + 64 char asset name).';
