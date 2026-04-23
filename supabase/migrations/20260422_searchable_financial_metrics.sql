-- Migration to add searchable, auto-calculating financial metrics to seller_listings
-- These columns are "Generated STORED", meaning they are calculated on save and indexed for high-performance search.

ALTER TABLE seller_listings 
  -- 1. Effective Search Revenue (LTM if exists, else 2025 fallback)
  ADD COLUMN IF NOT EXISTS search_revenue NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric,
      NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric
    )
  ) STORED,

  -- 2. Effective Search EBITDA
  ADD COLUMN IF NOT EXISTS search_ebitda NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'ebitda')::text, '')::numeric,
      NULLIF((financial_history->'2025'->>'ebitda')::text, '')::numeric
    )
  ) STORED,

  -- 3. EBITDA Margin (%)
  ADD COLUMN IF NOT EXISTS search_ebitda_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'ebitda')::text, '')::numeric, NULLIF((financial_history->'2025'->>'ebitda')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 4. Gross Margin (%)
  ADD COLUMN IF NOT EXISTS search_gross_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'gross_profit')::text, '')::numeric, NULLIF((financial_history->'2025'->>'gross_profit')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 5. EBIT Margin (%)
  ADD COLUMN IF NOT EXISTS search_ebit_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'ebit')::text, '')::numeric, NULLIF((financial_history->'2025'->>'ebit')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 6. Net Margin (%)
  ADD COLUMN IF NOT EXISTS search_net_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'net_income')::text, '')::numeric, NULLIF((financial_history->'2025'->>'net_income')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 7. YoY Revenue Growth (2025 vs 2024)
  ADD COLUMN IF NOT EXISTS search_revenue_growth_yoy NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN NULLIF((financial_history->'2024'->>'revenue')::text, '')::numeric IS NOT NULL 
           AND NULLIF((financial_history->'2024'->>'revenue')::text, '')::numeric != 0
           AND NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric IS NOT NULL
      THEN 
        (NULLIF((financial_history->'2025'->>'revenue')::text, '')::numeric - NULLIF((financial_history->'2024'->>'revenue')::text, '')::numeric) / 
         NULLIF((financial_history->'2024'->>'revenue')::text, '')::numeric
      ELSE NULL
    END
  ) STORED;

-- Add indexes to these columns for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_search_revenue ON seller_listings(search_revenue);
CREATE INDEX IF NOT EXISTS idx_search_ebitda ON seller_listings(search_ebitda);
CREATE INDEX IF NOT EXISTS idx_search_ebitda_margin ON seller_listings(search_ebitda_margin);
CREATE INDEX IF NOT EXISTS idx_search_revenue_growth ON seller_listings(search_revenue_growth_yoy);
