-- Revert previous division table
ALTER TABLE buyer_criteria DROP COLUMN IF EXISTS division_id;
DROP TABLE IF EXISTS divisions CASCADE;

-- Add divisions array to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS divisions TEXT[] DEFAULT '{}';

-- Add division text to buyer_criteria
ALTER TABLE buyer_criteria ADD COLUMN IF NOT EXISTS division TEXT;
