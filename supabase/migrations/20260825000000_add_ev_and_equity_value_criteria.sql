-- Migration: Add Enterprise Value and Equity Value columns to buyer_criteria
-- These fields represent Deal Size target criteria and are stored as absolute numbers.

-- 1. Add columns to buyer_criteria table
ALTER TABLE public.buyer_criteria
  ADD COLUMN IF NOT EXISTS search_enterprise_value_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_enterprise_value_max NUMERIC,
  ADD COLUMN IF NOT EXISTS search_equity_value_min NUMERIC,
  ADD COLUMN IF NOT EXISTS search_equity_value_max NUMERIC;

-- 2. Create indexes for high performance filtering/searching
CREATE INDEX IF NOT EXISTS idx_buyer_search_enterprise_value 
  ON public.buyer_criteria (search_enterprise_value_min, search_enterprise_value_max);

CREATE INDEX IF NOT EXISTS idx_buyer_search_equity_value 
  ON public.buyer_criteria (search_equity_value_min, search_equity_value_max);
