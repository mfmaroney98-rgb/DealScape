-- ============================================================
-- Financial Metrics reference table
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

-- Enable RLS (read-only for all authenticated users)
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financial metrics are publicly readable."
  ON financial_metrics FOR SELECT USING (true);

-- Seed initial metrics
INSERT INTO financial_metrics (name, sort_order) VALUES
  ('Revenue',              1),
  ('Revenue Growth (YoY)', 2),
  ('Gross Profit',         3),
  ('Gross Profit Margin',  4),
  ('EBITDA',               5),
  ('EBITDA Growth (YoY)',  6),
  ('EBITDA Margin',        7),
  ('EBIT',                 8),
  ('EBIT Margin',          9),
  ('Net Income',          10),
  ('Net Margin',          11)
ON CONFLICT (name) DO NOTHING;
