-- Migration to fix missing columns in buyer_criteria table
-- This ensures the DB matches the current BuyerCriteriaForm state

DO $$ 
BEGIN
    -- 1. Add investment_criteria_name
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='investment_criteria_name') THEN
        ALTER TABLE buyer_criteria ADD COLUMN investment_criteria_name TEXT;
    END IF;

    -- 2. Add overview
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='overview') THEN
        ALTER TABLE buyer_criteria ADD COLUMN overview TEXT;
    END IF;

    -- 3. Add company_name
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='company_name') THEN
        ALTER TABLE buyer_criteria ADD COLUMN company_name TEXT;
    END IF;

    -- 4. Add website
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='website') THEN
        ALTER TABLE buyer_criteria ADD COLUMN website TEXT;
    END IF;

    -- 5. Add organization_id
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='organization_id') THEN
        ALTER TABLE buyer_criteria ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;

    -- 6. Add buyer_type
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='buyer_type') THEN
        ALTER TABLE buyer_criteria ADD COLUMN buyer_type TEXT;
    END IF;

    -- 7. Add naics_codes
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='naics_codes') THEN
        ALTER TABLE buyer_criteria ADD COLUMN naics_codes TEXT[] DEFAULT '{}';
    END IF;

    -- 8. Add require_operator_owned
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='require_operator_owned') THEN
        ALTER TABLE buyer_criteria ADD COLUMN require_operator_owned BOOLEAN DEFAULT false;
    END IF;

    -- 9. Add financial_criteria (JSONB)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='financial_criteria') THEN
        ALTER TABLE buyer_criteria ADD COLUMN financial_criteria JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- 10. Add categorized_keywords
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='categorized_keywords') THEN
        ALTER TABLE buyer_criteria ADD COLUMN categorized_keywords JSONB DEFAULT '{}';
    END IF;

END $$;
