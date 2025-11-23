-- Add table to track which NFT is reserved for each eligibility
-- This ensures the preview and mint show/give the same NFT

CREATE TABLE IF NOT EXISTS eligibility_nft_reservations (
  eligibility_id UUID PRIMARY KEY REFERENCES eligibilities(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES nft_catalog(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eligibility_nft_reservations_catalog ON eligibility_nft_reservations(catalog_id);

COMMENT ON TABLE eligibility_nft_reservations IS 'Maps eligibilities to their pre-selected NFTs to ensure consistency';
