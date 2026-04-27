-- Add categorized_keywords column to seller_listings
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS categorized_keywords JSONB DEFAULT '{}';
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS last_embedded_text TEXT;

-- Also add it to buyer_criteria if we want symmetric matching
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS categorized_keywords JSONB DEFAULT '{}';
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS last_embedded_text TEXT;
