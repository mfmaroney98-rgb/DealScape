-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop the column if it was partially created with 3072 dimensions in the failed run
ALTER TABLE seller_listings DROP COLUMN IF EXISTS embedding;

-- Add embedding column with 1536 dimensions (Max for ivfflat index is 2000)
ALTER TABLE seller_listings 
  ADD COLUMN embedding vector(1536);

-- Create an index for fast semantic searching (Cosine Similarity)
-- Note: lists=100 is a good default for small/medium datasets. 
CREATE INDEX IF NOT EXISTS seller_listings_embedding_idx 
ON seller_listings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
