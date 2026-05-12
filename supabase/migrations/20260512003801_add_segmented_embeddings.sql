-- Add segmented embedding columns for triple-vector matching
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS embedding_industry vector(1536);
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS embedding_model vector(1536);
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS embedding_target vector(1536);

ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS embedding_industry vector(1536);
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS embedding_model vector(1536);
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS embedding_target vector(1536);
