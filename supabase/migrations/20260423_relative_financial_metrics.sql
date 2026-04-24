-- Migration to update financial metrics to use relative years (FY0, FY-1, FY-2)
-- This ensures the platform is future-proof and doesn't require annual code updates.

-- 1. Update the helper function to use relative keys and explicit dates
-- We now expect every period to potentially have a 'date' field in the JSON.
CREATE OR REPLACE FUNCTION calculate_revenue_years(financial_history JSONB)
RETURNS NUMERIC AS $$
DECLARE
    end_date DATE;
    start_date DATE;
BEGIN
    -- Determine End Date (LTM date, fallback to FY0 date)
    end_date := COALESCE(
        NULLIF(financial_history->'LTM'->>'date', '')::DATE,
        NULLIF(financial_history->'FY0'->>'date', '')::DATE
    );

    -- Determine Start Date (Earliest year date provided)
    -- We check FY-2 first for a 3-year span, then fallback to FY-1
    start_date := COALESCE(
        NULLIF(financial_history->'FY-2'->>'date', '')::DATE,
        NULLIF(financial_history->'FY-1'->>'date', '')::DATE
    );

    IF end_date IS NULL OR start_date IS NULL THEN
        RETURN 0;
    END IF;

    -- Return difference in years (fractional)
    -- Using 365.25 to account for leap years
    RETURN (end_date - start_date) / 365.25;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update Table Definitions
-- We drop and recreate the generated columns to point to the new JSON keys.
ALTER TABLE seller_listings 
  DROP COLUMN IF EXISTS search_revenue,
  DROP COLUMN IF EXISTS search_ebitda,
  DROP COLUMN IF EXISTS search_ebitda_margin,
  DROP COLUMN IF EXISTS search_gross_margin,
  DROP COLUMN IF EXISTS search_ebit_margin,
  DROP COLUMN IF EXISTS search_net_margin,
  DROP COLUMN IF EXISTS search_revenue_growth_yoy,
  DROP COLUMN IF EXISTS search_revenue_cagr;

ALTER TABLE seller_listings 
  -- 1. Effective Search Revenue (LTM if exists, else FY0 fallback)
  ADD COLUMN search_revenue NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric,
      NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric
    )
  ) STORED,

  -- 2. Effective Search EBITDA
  ADD COLUMN search_ebitda NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      NULLIF((financial_history->'LTM'->>'ebitda')::text, '')::numeric,
      NULLIF((financial_history->'FY0'->>'ebitda')::text, '')::numeric
    )
  ) STORED,

  -- 3. EBITDA Margin (%)
  ADD COLUMN search_ebitda_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'ebitda')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'ebitda')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 4. Gross Margin (%)
  ADD COLUMN search_gross_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'gross_profit')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'gross_profit')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 5. EBIT Margin (%)
  ADD COLUMN search_ebit_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'ebit')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'ebit')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 6. Net Margin (%)
  ADD COLUMN search_net_margin NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric, 0) = 0 THEN NULL
      ELSE 
        COALESCE(NULLIF((financial_history->'LTM'->>'net_income')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'net_income')::text, '')::numeric) / 
        NULLIF(COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric), 0)
    END
  ) STORED,

  -- 7. YoY Revenue Growth (FY0 vs FY-1)
  ADD COLUMN search_revenue_growth_yoy NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric IS NOT NULL 
           AND NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric != 0
           AND NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric IS NOT NULL
      THEN 
        (NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric - NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric) / 
         NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric
      ELSE NULL
    END
  ) STORED,

  -- 8. Fractional Revenue CAGR
  ADD COLUMN search_revenue_cagr NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN calculate_revenue_years(financial_history) > 0.5 
           AND COALESCE(NULLIF((financial_history->'FY-2'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric, 0) > 0
      THEN 
        POWER(
          (
            COALESCE(NULLIF((financial_history->'LTM'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY0'->>'revenue')::text, '')::numeric) / 
            COALESCE(NULLIF((financial_history->'FY-2'->>'revenue')::text, '')::numeric, NULLIF((financial_history->'FY-1'->>'revenue')::text, '')::numeric)
          ),
          (1.0 / NULLIF(calculate_revenue_years(financial_history), 0))
        ) - 1
      ELSE NULL
    END
  ) STORED;

-- 3. Re-add indexes
CREATE INDEX IF NOT EXISTS idx_search_revenue ON seller_listings(search_revenue);
CREATE INDEX IF NOT EXISTS idx_search_ebitda ON seller_listings(search_ebitda);
CREATE INDEX IF NOT EXISTS idx_search_ebitda_margin ON seller_listings(search_ebitda_margin);
CREATE INDEX IF NOT EXISTS idx_search_revenue_growth ON seller_listings(search_revenue_growth_yoy);
CREATE INDEX IF NOT EXISTS idx_search_revenue_cagr ON seller_listings(search_revenue_cagr);
