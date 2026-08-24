-- Add reason_for_sale column to buyer_criteria
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS reason_for_sale TEXT[] DEFAULT '{}';
