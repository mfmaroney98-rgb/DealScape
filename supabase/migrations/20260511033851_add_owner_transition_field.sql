-- Add owner_transition field to seller_listings and buyer_criteria
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS owner_transition TEXT;
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS owner_transition TEXT;

-- Update the view or RPC if necessary (usually not needed if just adding columns)
