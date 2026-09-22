-- Migration: Add overview document tracking columns to buyer_criteria table
-- Used for industry-specific or transaction-specific criteria overview PDFs

ALTER TABLE public.buyer_criteria
  ADD COLUMN IF NOT EXISTS overview_document_url text,
  ADD COLUMN IF NOT EXISTS overview_file_name text;

-- Add comment explaining purpose
COMMENT ON COLUMN public.buyer_criteria.overview_document_url IS 'Public or signed storage URL for industry-specific or transaction-specific criteria overview PDF';
COMMENT ON COLUMN public.buyer_criteria.overview_file_name IS 'Original file name of the criteria overview PDF document';
