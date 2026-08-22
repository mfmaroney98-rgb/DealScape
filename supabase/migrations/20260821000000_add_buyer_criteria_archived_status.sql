-- Add archived column to buyer_criteria to support soft-deletes
ALTER TABLE public.buyer_criteria ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
