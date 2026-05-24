-- Create or replace the NAICS Waterfall calculation function
CREATE OR REPLACE FUNCTION calculate_naics_match_bonus(buyer_codes TEXT[], seller_codes TEXT[])
RETURNS NUMERIC AS $$
DECLARE
    b_code TEXT;
    s_code TEXT;
    best_score NUMERIC := 0;
    current_score NUMERIC;
BEGIN
    IF buyer_codes IS NULL OR seller_codes IS NULL OR array_length(buyer_codes, 1) IS NULL OR array_length(seller_codes, 1) IS NULL THEN
        -- Fallback default if either is not set: return null so we know not to apply 50/50 blend
        RETURN NULL;
    END IF;

    -- Loop through all pairs to find the strongest match
    FOREACH b_code IN ARRAY buyer_codes LOOP
        FOREACH s_code IN ARRAY seller_codes LOOP
            IF b_code = s_code THEN
                -- Same exact code (e.g. same 4-digit) -> 100
                current_score := 100.0;
            ELSIF length(s_code) > length(b_code) AND substring(s_code FROM 1 FOR length(b_code)) = b_code THEN
                -- Seller code is a child of buyer's code (e.g. buyer selected 3-digit, seller is within it) -> 100
                current_score := 100.0;
            ELSIF length(b_code) >= 3 AND length(s_code) >= 3 AND substring(b_code FROM 1 FOR 3) = substring(s_code FROM 1 FOR 3) THEN
                -- Same 3-digit parent, different 4-digit -> 70
                current_score := 70.0;
            ELSIF length(b_code) >= 2 AND length(s_code) >= 2 AND substring(b_code FROM 1 FOR 2) = substring(s_code FROM 1 FOR 2) THEN
                -- Same 2-digit parent, different 3-digit -> 50
                current_score := 50.0;
            ELSE
                -- No shared 2-digit parent -> 0
                current_score := 0.0;
            END IF;
            
            IF current_score > best_score THEN
                best_score := current_score;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN best_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop and recreate the match_listings_for_criteria function to include separate industry and semantic scores
DROP FUNCTION IF EXISTS match_listings_for_criteria(uuid);

CREATE OR REPLACE FUNCTION match_listings_for_criteria(p_criteria_id UUID)
RETURNS TABLE (
    listing_id UUID,
    seller_anon_name TEXT,
    seller_status TEXT,
    search_revenue NUMERIC,
    search_ebitda NUMERIC,
    search_ebitda_margin NUMERIC,
    search_revenue_growth_yoy NUMERIC,
    locations TEXT[],
    keywords TEXT,
    categorized_keywords JSONB,
    pref_transaction_type TEXT[],
    is_founder_owned BOOLEAN,
    is_female_owned BOOLEAN,
    is_minority_owned BOOLEAN,
    is_family_owned BOOLEAN,
    is_operator_owned BOOLEAN,
    owner_transition TEXT,
    financial_score NUMERIC,
    geography_score NUMERIC,
    industry_score NUMERIC,     -- NEW
    semantic_score NUMERIC,     -- NEW
    industry_fit_score NUMERIC, -- Blended
    bonus_score NUMERIC,
    bonus_reasons TEXT[],
    total_score NUMERIC,
    match_tier TEXT
) AS $$
DECLARE
    v_buyer RECORD;
    v_buyer_countries TEXT[];
    v_buyer_continents TEXT[];
BEGIN
    -- 1. Load the buyer criteria
    SELECT * INTO v_buyer FROM buyer_criteria WHERE id = p_criteria_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Buyer criteria % not found', p_criteria_id;
    END IF;

    -- Pre-compute buyer's country codes and continent info from locations array
    SELECT ARRAY(
        SELECT DISTINCT split_part(loc, ':', 1)
        FROM unnest(v_buyer.locations) AS loc
        WHERE loc IS NOT NULL AND loc != ''
    ) INTO v_buyer_countries;

    SELECT ARRAY(
        SELECT DISTINCT gc.continent
        FROM unnest(v_buyer_countries) AS cc
        JOIN global_countries gc ON gc.code = cc
    ) INTO v_buyer_continents;

    RETURN QUERY
    WITH semantic_scored AS (
        SELECT
            sl.*,
            -- Triple-Vector Hybrid Matching: Industry (60%), Model (30%), Target (10%)
            (
                -- 1. Industry Bucket (60% weight)
                (
                    COALESCE(
                        (
                            -- Semantic Component (70%)
                            (CASE 
                                WHEN v_buyer.embedding_industry IS NULL OR sl.embedding_industry IS NULL THEN 100.0 
                                ELSE GREATEST(0, ((1.0 - (sl.embedding_industry <=> v_buyer.embedding_industry)) - 0.35) / 0.65 * 100.0) 
                            END * 0.7) +
                            -- Fuzzy Keyword Component (30%)
                            (COALESCE(calculate_fuzzy_overlap(v_buyer.categorized_keywords->'industry', sl.categorized_keywords->'industry'), 100.0) * 0.3)
                        ), 100.0
                    ) * 0.60
                ) +
                -- 2. Model Bucket (30% weight)
                (
                    COALESCE(
                        (
                            -- Semantic Component (70%)
                            (CASE 
                                WHEN v_buyer.embedding_model IS NULL OR sl.embedding_model IS NULL THEN 100.0 
                                ELSE GREATEST(0, ((1.0 - (sl.embedding_model <=> v_buyer.embedding_model)) - 0.35) / 0.65 * 100.0) 
                            END * 0.7) +
                            -- Fuzzy Keyword Component (30%)
                            (COALESCE(calculate_fuzzy_overlap(
                                (COALESCE(v_buyer.categorized_keywords->'business_model', '[]'::jsonb) || COALESCE(v_buyer.categorized_keywords->'revenue_model', '[]'::jsonb)),
                                (COALESCE(sl.categorized_keywords->'business_model', '[]'::jsonb) || COALESCE(sl.categorized_keywords->'revenue_model', '[]'::jsonb))
                            ), 100.0) * 0.3)
                        ), 100.0
                    ) * 0.30
                ) +
                -- 3. Target Bucket (10% weight)
                (
                    COALESCE(
                        (
                            -- Semantic Component (70%)
                            (CASE 
                                WHEN v_buyer.embedding_target IS NULL OR sl.embedding_target IS NULL THEN 100.0 
                                ELSE GREATEST(0, ((1.0 - (sl.embedding_target <=> v_buyer.embedding_target)) - 0.35) / 0.65 * 100.0) 
                            END * 0.7) +
                            -- Fuzzy Keyword Component (30%)
                            (COALESCE(calculate_fuzzy_overlap(
                                (COALESCE(sl.categorized_keywords->'customer_type', '[]'::jsonb) || COALESCE(sl.categorized_keywords->'end_market', '[]'::jsonb)),
                                (COALESCE(sl.categorized_keywords->'customer_type', '[]'::jsonb) || COALESCE(sl.categorized_keywords->'end_market', '[]'::jsonb))
                            ), 100.0) * 0.3)
                        ), 100.0
                    ) * 0.10
                )
            ) AS semantic_score
        FROM seller_listings sl
        WHERE sl.status = 'Active'::listing_status
        -- Hard Filters
        AND (
            v_buyer.pref_transaction_type IS NULL
            OR array_length(v_buyer.pref_transaction_type, 1) IS NULL
            OR sl.pref_transaction_type && v_buyer.pref_transaction_type
        )
    ),
    scored AS (
        SELECT
            ss.id AS listing_id,
            ss.seller_anon_name,
            ss.status::TEXT AS seller_status,
            ss.search_revenue,
            ss.search_ebitda,
            ss.search_ebitda_margin,
            ss.search_revenue_growth_yoy,
            ss.locations,
            ss.keywords,
            ss.categorized_keywords,
            ss.pref_transaction_type::TEXT[],
            ss.is_founder_owned,
            ss.is_female_owned,
            ss.is_minority_owned,
            ss.is_family_owned,
            ss.is_operator_owned,
            ss.owner_transition,
            
            -- Financial Score
            (SELECT COALESCE(AVG(metric_score), 0) FROM (
                SELECT CASE
                    WHEN v_buyer.search_revenue_min IS NULL AND v_buyer.search_revenue_max IS NULL THEN NULL
                    WHEN ss.search_revenue IS NULL THEN 0
                    WHEN ss.search_revenue >= COALESCE(v_buyer.search_revenue_min, ss.search_revenue)
                    AND ss.search_revenue <= COALESCE(v_buyer.search_revenue_max, ss.search_revenue) THEN 100
                    WHEN ss.search_revenue < v_buyer.search_revenue_min THEN
                        GREATEST(0, 100 - (((v_buyer.search_revenue_min - ss.search_revenue) /
                            NULLIF(COALESCE(v_buyer.search_revenue_max, v_buyer.search_revenue_min * 2) - v_buyer.search_revenue_min, 1) * 5.0) * 100))
                    ELSE
                        GREATEST(0, 100 - (((ss.search_revenue - v_buyer.search_revenue_max) /
                            NULLIF(COALESCE(v_buyer.search_revenue_max, v_buyer.search_revenue_min * 2) - COALESCE(v_buyer.search_revenue_min, 0), 1) * 5.0) * 100))
                    END AS metric_score
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_ebitda_min IS NULL AND v_buyer.search_ebitda_max IS NULL THEN NULL
                    WHEN ss.search_ebitda IS NULL THEN 0
                    WHEN ss.search_ebitda >= COALESCE(v_buyer.search_ebitda_min, ss.search_ebitda)
                    AND ss.search_ebitda <= COALESCE(v_buyer.search_ebitda_max, ss.search_ebitda) THEN 100
                    WHEN ss.search_ebitda < v_buyer.search_ebitda_min THEN
                        GREATEST(0, 100 - (((v_buyer.search_ebitda_min - ss.search_ebitda) /
                            NULLIF(COALESCE(v_buyer.search_ebitda_max, v_buyer.search_ebitda_min * 2) - v_buyer.search_ebitda_min, 1) * 5.0) * 100))
                    ELSE
                        GREATEST(0, 100 - (((ss.search_ebitda - v_buyer.search_ebitda_max) /
                            NULLIF(COALESCE(v_buyer.search_ebitda_max, v_buyer.search_ebitda_min * 2) - COALESCE(v_buyer.search_ebitda_min, 0), 1) * 5.0) * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_ebitda_margin_min IS NULL AND v_buyer.search_ebitda_margin_max IS NULL THEN NULL
                    WHEN ss.search_ebitda_margin IS NULL THEN 0
                    WHEN ss.search_ebitda_margin >= COALESCE(v_buyer.search_ebitda_margin_min, ss.search_ebitda_margin)
                    AND ss.search_ebitda_margin <= COALESCE(v_buyer.search_ebitda_margin_max, ss.search_ebitda_margin) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_ebitda_margin - COALESCE(v_buyer.search_ebitda_margin_min, v_buyer.search_ebitda_margin_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_gross_profit_min IS NULL AND v_buyer.search_gross_profit_max IS NULL THEN NULL
                    WHEN ss.search_gross_profit IS NULL THEN 0
                    WHEN ss.search_gross_profit >= COALESCE(v_buyer.search_gross_profit_min, ss.search_gross_profit)
                    AND ss.search_gross_profit <= COALESCE(v_buyer.search_gross_profit_max, ss.search_gross_profit) THEN 100
                    WHEN ss.search_gross_profit < v_buyer.search_gross_profit_min THEN
                        GREATEST(0, 100 - (((v_buyer.search_gross_profit_min - ss.search_gross_profit) /
                            NULLIF(COALESCE(v_buyer.search_gross_profit_max, v_buyer.search_gross_profit_min * 2) - v_buyer.search_gross_profit_min, 1) * 5.0) * 100))
                    ELSE
                        GREATEST(0, 100 - (((ss.search_gross_profit - v_buyer.search_gross_profit_max) /
                            NULLIF(COALESCE(v_buyer.search_gross_profit_max, v_buyer.search_gross_profit_min * 2) - COALESCE(v_buyer.search_gross_profit_min, 0), 1) * 5.0) * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_gross_margin_min IS NULL AND v_buyer.search_gross_margin_max IS NULL THEN NULL
                    WHEN ss.search_gross_margin IS NULL THEN 0
                    WHEN ss.search_gross_margin >= COALESCE(v_buyer.search_gross_margin_min, ss.search_gross_margin)
                    AND ss.search_gross_margin <= COALESCE(v_buyer.search_gross_margin_max, ss.search_gross_margin) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_gross_margin - COALESCE(v_buyer.search_gross_margin_min, v_buyer.search_gross_margin_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_ebit_min IS NULL AND v_buyer.search_ebit_max IS NULL THEN NULL
                    WHEN ss.search_ebit IS NULL THEN 0
                    WHEN ss.search_ebit >= COALESCE(v_buyer.search_ebit_min, ss.search_ebit)
                    AND ss.search_ebit <= COALESCE(v_buyer.search_ebit_max, ss.search_ebit) THEN 100
                    WHEN ss.search_ebit < v_buyer.search_ebit_min THEN
                        GREATEST(0, 100 - (((v_buyer.search_ebit_min - ss.search_ebit) /
                            NULLIF(COALESCE(v_buyer.search_ebit_max, v_buyer.search_ebit_min * 2) - v_buyer.search_ebit_min, 1) * 5.0) * 100))
                    ELSE
                        GREATEST(0, 100 - (((ss.search_ebit - v_buyer.search_ebit_max) /
                            NULLIF(COALESCE(v_buyer.search_ebit_max, v_buyer.search_ebit_min * 2) - COALESCE(v_buyer.search_ebit_min, 0), 1) * 5.0) * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_ebit_margin_min IS NULL AND v_buyer.search_ebit_margin_max IS NULL THEN NULL
                    WHEN ss.search_ebit_margin IS NULL THEN 0
                    WHEN ss.search_ebit_margin >= COALESCE(v_buyer.search_ebit_margin_min, ss.search_ebit_margin)
                    AND ss.search_ebit_margin <= COALESCE(v_buyer.search_ebit_margin_max, ss.search_ebit_margin) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_ebit_margin - COALESCE(v_buyer.search_ebit_margin_min, v_buyer.search_ebit_margin_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_net_income_min IS NULL AND v_buyer.search_net_income_max IS NULL THEN NULL
                    WHEN ss.search_net_income IS NULL THEN 0
                    WHEN ss.search_net_income >= COALESCE(v_buyer.search_net_income_min, ss.search_net_income)
                    AND ss.search_net_income <= COALESCE(v_buyer.search_net_income_max, ss.search_net_income) THEN 100
                    WHEN ss.search_net_income < v_buyer.search_net_income_min THEN
                        GREATEST(0, 100 - (((v_buyer.search_net_income_min - ss.search_net_income) /
                            NULLIF(COALESCE(v_buyer.search_net_income_max, v_buyer.search_net_income_min * 2) - v_buyer.search_net_income_min, 1) * 5.0) * 100))
                    ELSE
                        GREATEST(0, 100 - (((ss.search_net_income - v_buyer.search_net_income_max) /
                            NULLIF(COALESCE(v_buyer.search_net_income_max, v_buyer.search_net_income_min * 2) - COALESCE(v_buyer.search_net_income_min, 0), 1) * 5.0) * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_net_margin_min IS NULL AND v_buyer.search_net_margin_max IS NULL THEN NULL
                    WHEN ss.search_net_margin IS NULL THEN 0
                    WHEN ss.search_net_margin >= COALESCE(v_buyer.search_net_margin_min, ss.search_net_margin)
                    AND ss.search_net_margin <= COALESCE(v_buyer.search_net_margin_max, ss.search_net_margin) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_net_margin - COALESCE(v_buyer.search_net_margin_min, v_buyer.search_net_margin_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_revenue_growth_yoy_min IS NULL AND v_buyer.search_revenue_growth_yoy_max IS NULL THEN NULL
                    WHEN ss.search_revenue_growth_yoy IS NULL THEN 0
                    WHEN ss.search_revenue_growth_yoy >= COALESCE(v_buyer.search_revenue_growth_yoy_min, ss.search_revenue_growth_yoy)
                    AND ss.search_revenue_growth_yoy <= COALESCE(v_buyer.search_revenue_growth_yoy_max, ss.search_revenue_growth_yoy) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_revenue_growth_yoy - COALESCE(v_buyer.search_revenue_growth_yoy_min, v_buyer.search_revenue_growth_yoy_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_revenue_cagr_min IS NULL AND v_buyer.search_revenue_cagr_max IS NULL THEN NULL
                    WHEN ss.search_revenue_cagr IS NULL THEN 0
                    WHEN ss.search_revenue_cagr >= COALESCE(v_buyer.search_revenue_cagr_min, ss.search_revenue_cagr)
                    AND ss.search_revenue_cagr <= COALESCE(v_buyer.search_revenue_cagr_max, ss.search_revenue_cagr) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_revenue_cagr - COALESCE(v_buyer.search_revenue_cagr_min, v_buyer.search_revenue_cagr_max)) / 0.05 * 100))
                    END
                UNION ALL SELECT CASE
                    WHEN v_buyer.search_ebitda_growth_yoy_min IS NULL AND v_buyer.search_ebitda_growth_yoy_max IS NULL THEN NULL
                    WHEN ss.search_ebitda_growth_yoy IS NULL THEN 0
                    WHEN ss.search_ebitda_growth_yoy >= COALESCE(v_buyer.search_ebitda_growth_yoy_min, ss.search_ebitda_growth_yoy)
                    AND ss.search_ebitda_growth_yoy <= COALESCE(v_buyer.search_ebitda_growth_yoy_max, ss.search_ebitda_growth_yoy) THEN 100
                    ELSE GREATEST(0, 100 - (ABS(ss.search_ebitda_growth_yoy - COALESCE(v_buyer.search_ebitda_growth_yoy_min, v_buyer.search_ebitda_growth_yoy_max)) / 0.05 * 100))
                    END
            ) AS sub(metric_score) WHERE metric_score IS NOT NULL
            ) AS financial_score,

            -- Geography Score
            CASE
                WHEN v_buyer.locations IS NULL OR array_length(v_buyer.locations, 1) IS NULL THEN 100.0
                WHEN ss.locations IS NOT NULL AND ss.locations && v_buyer.locations THEN 100.0
                WHEN ss.locations IS NOT NULL AND EXISTS (
                    SELECT 1 FROM unnest(ss.locations) AS sl_loc
                    WHERE split_part(sl_loc, ':', 1) = ANY(v_buyer_countries)
                ) THEN 50.0
                ELSE 0.0
            END AS geography_score,

            -- Individual Scores
            calculate_naics_match_bonus(v_buyer.naics_codes, ss.naics_codes) AS industry_score,
            ss.semantic_score,

            -- Blended Industry Fit Score: 50% NAICS waterfall + 50% Semantic score
            -- Fallback gracefully to semantic score if either side lacks NAICS codes
            CASE
                WHEN calculate_naics_match_bonus(v_buyer.naics_codes, ss.naics_codes) IS NULL THEN ss.semantic_score
                ELSE ROUND((0.50 * calculate_naics_match_bonus(v_buyer.naics_codes, ss.naics_codes) + 0.50 * ss.semantic_score)::NUMERIC, 1)
            END AS industry_fit_score,

            -- Bonus placeholder
            0::NUMERIC AS bonus_score,
            ARRAY[]::TEXT[] AS bonus_reasons

        FROM semantic_scored ss
    )
    SELECT
        s.listing_id,
        s.seller_anon_name,
        s.seller_status,
        s.search_revenue,
        s.search_ebitda,
        s.search_ebitda_margin,
        s.search_revenue_growth_yoy,
        s.locations,
        s.keywords,
        s.categorized_keywords,
        s.pref_transaction_type,
        s.is_founder_owned,
        s.is_female_owned,
        s.is_minority_owned,
        s.is_family_owned,
        s.is_operator_owned,
        s.owner_transition,
        ROUND(s.financial_score::NUMERIC, 1) AS financial_score,
        ROUND(s.geography_score::NUMERIC, 1) AS geography_score,
        ROUND(s.industry_score::NUMERIC, 1) AS industry_score,       -- NEW
        ROUND(s.semantic_score::NUMERIC, 1) AS semantic_score,       -- NEW
        ROUND(s.industry_fit_score::NUMERIC, 1) AS industry_fit_score,
        ROUND(s.bonus_score::NUMERIC, 1) AS bonus_score,
        s.bonus_reasons,
        -- Final blended rank score
        ROUND(
            (0.30 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
            + 0.70 * s.industry_fit_score)::NUMERIC
        , 1) AS total_score,
        -- Tier classification
        CASE
            WHEN (0.30 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
                + 0.70 * s.industry_fit_score)::NUMERIC >= 75 THEN 'Strong'
            WHEN (0.30 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
                + 0.70 * s.industry_fit_score)::NUMERIC >= 45 THEN 'Moderate'
            ELSE 'Weak'
        END AS match_tier
    FROM scored s
    WHERE s.geography_score > 0
    ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;
