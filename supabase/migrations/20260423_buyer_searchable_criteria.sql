-- Migration to add standardized search criteria columns to buyer_criteria
-- This aligns with the searchable columns added to seller_listings

-- 1. Add Revenue CAGR to the reference table
INSERT INTO financial_metrics (name, sort_order) 
VALUES ('Revenue CAGR', 12)
ON CONFLICT (name) DO NOTHING;

-- 2. Update seller_listings with missing absolute searchable metrics
-- This ensures we can match absolute Gross Profit, EBIT, and Net Income
ALTER TABLE seller_listings 
  ADD COLUMN IF NOT EXISTS search_gross_profit NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'gross_profit')::text, '')::numeric,
      NULLIF((financial_history->'2025'->>'gross_profit')::text, '')::numeric
    )
  ) STORED,
  
  ADD COLUMN IF NOT EXISTS search_ebit NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'ebit')::text, '')::numeric,
      NULLIF((financial_history->'2025'->>'ebit')::text, '')::numeric
    )
  ) STORED,
  
  ADD COLUMN IF NOT EXISTS search_net_income NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'net_income')::text, '')::numeric,
      NULLIF((financial_history->'2025'->>'net_income')::text, '')::numeric
    )
  ) STORED,

  ADD COLUMN IF NOT EXISTS search_ebitda_growth_yoy NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN NULLIF((financial_history->'2024'->>'ebitda')::text, '')::numeric IS NOT NULL 
           AND NULLIF((financial_history->'2024'->>'ebitda')::text, '')::numeric != 0
           AND NULLIF((financial_history->'2025'->>'ebitda')::text, '')::numeric IS NOT NULL
      THEN 
        (NULLIF((financial_history->'2025'->>'ebitda')::text, '')::numeric - NULLIF((financial_history->'2024'->>'ebitda')::text, '')::numeric) / 
         NULLIF((financial_history->'2024'->>'ebitda')::text, '')::numeric
      ELSE NULL
    END
  ) STORED;

-- 3. Update buyer_criteria with min/max columns for all searchable metrics
ALTER TABLE buyer_criteria
  -- Revenue
  ADD COLUMN IF NOT EXISTS search_revenue_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_revenue_max NUMERIC,
  -- Revenue Growth
  ADD COLUMN IF NOT EXISTS search_revenue_growth_yoy_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_revenue_growth_yoy_max NUMERIC,
  -- Revenue CAGR
  ADD COLUMN IF NOT EXISTS search_revenue_cagr_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_revenue_cagr_max NUMERIC,
  -- Gross Profit
  ADD COLUMN IF NOT EXISTS search_gross_profit_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_gross_profit_max NUMERIC,
  -- Gross Profit Margin
  ADD COLUMN IF NOT EXISTS search_gross_margin_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_gross_margin_max NUMERIC,
  -- EBITDA
  ADD COLUMN IF NOT EXISTS search_ebitda_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_ebitda_max NUMERIC,
  -- EBITDA Growth
  ADD COLUMN IF NOT EXISTS search_ebitda_growth_yoy_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_ebitda_growth_yoy_max NUMERIC,
  -- EBITDA Margin
  ADD COLUMN IF NOT EXISTS search_ebitda_margin_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_ebitda_margin_max NUMERIC,
  -- EBIT
  ADD COLUMN IF NOT EXISTS search_ebit_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_ebit_max NUMERIC,
  -- EBIT Margin
  ADD COLUMN IF NOT EXISTS search_ebit_margin_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_ebit_margin_max NUMERIC,
  -- Net Income
  ADD COLUMN IF NOT EXISTS search_net_income_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_net_income_max NUMERIC,
  -- Net Margin
  ADD COLUMN IF NOT EXISTS search_net_margin_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_net_margin_max NUMERIC;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyer_search_revenue ON buyer_criteria(search_revenue_min, search_revenue_max);
CREATE INDEX IF NOT EXISTS idx_buyer_search_ebitda ON buyer_criteria(search_ebitda_min, search_ebitda_max);
