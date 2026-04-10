-- Schema Alignment Migration (Aligning DB with UI forms)

-- 1. Sellers Table Updates
ALTER TABLE sellers RENAME COLUMN company_ownership TO ownership_structure;
ALTER TABLE sellers ADD COLUMN year_founded TEXT; -- Using TEXT since users enter "YYYY"
ALTER TABLE sellers ADD COLUMN is_operator_owned BOOLEAN DEFAULT false;

-- 2. Buyer Criteria Updates
ALTER TABLE buyer_criteria ADD COLUMN company_name TEXT;
ALTER TABLE buyer_criteria ADD COLUMN website TEXT;
ALTER TABLE buyer_criteria ADD COLUMN overview TEXT;
ALTER TABLE buyer_criteria ADD COLUMN buyer_type TEXT;
ALTER TABLE buyer_criteria ADD COLUMN naics_codes TEXT[] DEFAULT '{}';
ALTER TABLE buyer_criteria ADD COLUMN require_operator_owned BOOLEAN DEFAULT false;

-- Rename transaction_types to map to pref_transaction_type from the UI
ALTER TABLE buyer_criteria RENAME COLUMN transaction_types TO pref_transaction_type;

-- Convert hardcoded financial metrics to dynamic JSONB matching the UI's financial_criteria
ALTER TABLE buyer_criteria DROP COLUMN IF EXISTS min_revenue;
ALTER TABLE buyer_criteria DROP COLUMN IF EXISTS max_revenue;
ALTER TABLE buyer_criteria DROP COLUMN IF EXISTS min_ebitda;
ALTER TABLE buyer_criteria DROP COLUMN IF EXISTS max_ebitda;
ALTER TABLE buyer_criteria ADD COLUMN financial_criteria JSONB DEFAULT '[]'::jsonb;
