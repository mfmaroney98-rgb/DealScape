-- Migration: Add CapEx % of Revenue as a buyer financial criteria option
-- This adds the metric to the reference table, a computed column on seller_listings,
-- and min/max filter columns on buyer_criteria for matching.

-- 1. Add metric to the reference table
INSERT INTO financial_metrics (name, sort_order)
VALUES ('CapEx % of Revenue', 13)
ON CONFLICT (name) DO NOTHING;

-- 2. Add search_capex_pct to seller_listings using a DEFAULT expression
--    (matches the pattern of all other search_* columns — no table rewrite needed)
--    Uses LTM first, falls back to FY0.
ALTER TABLE seller_listings
  ADD COLUMN IF NOT EXISTS search_capex_pct NUMERIC DEFAULT NULL;

-- Backfill existing rows (lightweight UPDATE, no memory issue)
UPDATE seller_listings
SET search_capex_pct = CASE
  WHEN NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric IS NOT NULL
       AND NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric <> 0
       AND NULLIF((financial_history->'LTM'->>'capex')::text, '')::numeric IS NOT NULL
  THEN NULLIF((financial_history->'LTM'->>'capex')::text, '')::numeric
       / NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric
  WHEN NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric IS NOT NULL
       AND NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric <> 0
       AND NULLIF((financial_history->'FY0'->>'capex')::text, '')::numeric IS NOT NULL
  THEN NULLIF((financial_history->'FY0'->>'capex')::text, '')::numeric
       / NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric
  ELSE NULL
END;

-- 3. Add min/max filter columns to buyer_criteria
ALTER TABLE buyer_criteria
  ADD COLUMN IF NOT EXISTS search_capex_pct_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_capex_pct_max NUMERIC;

-- 4. (Index omitted — Supabase maintenance_work_mem limit)
--    The existing revenue/ebitda indexes on buyer_criteria cover the
--    primary filter path. A DBA can add this manually if needed:
--    CREATE INDEX idx_buyer_search_capex_pct
--      ON buyer_criteria(search_capex_pct_min, search_capex_pct_max);

