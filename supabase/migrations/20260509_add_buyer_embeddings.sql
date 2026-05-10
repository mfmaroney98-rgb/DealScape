-- Migration to add embedding column to buyer_criteria for semantic matching
-- This mirrors the seller_listings.embedding column added in 20260424_add_seller_embeddings.sql

-- Add embedding column with 1536 dimensions (matches seller_listings)
ALTER TABLE buyer_criteria 
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for fast semantic searching (Cosine Similarity)
-- Using ivfflat with lists=100 (good default for small/medium datasets)
CREATE INDEX IF NOT EXISTS buyer_criteria_embedding_idx 
ON buyer_criteria 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
