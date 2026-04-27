-- Add categorized_keywords column to seller_listings
ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS categorized_keywords JSONB DEFAULT '{}';

-- Also add it to buyer_criteria if we want symmetric matching
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS categorized_keywords JSONB DEFAULT '{}';
