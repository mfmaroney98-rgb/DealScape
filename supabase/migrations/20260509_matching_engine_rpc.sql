    -- Matching Engine RPC: match_listings_for_criteria
    -- Takes a buyer_criteria ID and returns all active seller listings scored and ranked.
    --
    -- Scoring Layers:
    --   Layer 1: Hard Filters (transaction type, NAICS codes)
    --   Layer 2: Quantitative scoring (financial range fit + geography tiers)
    --   Layer 3: Semantic scoring (embedding cosine similarity + keyword overlap)
    --   Bonus:   Ownership flags, transaction type depth, NAICS depth

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
        keywords TEXT[],
        categorized_keywords JSONB,
        pref_transaction_type TEXT[],
        is_founder_owned BOOLEAN,
        is_female_owned BOOLEAN,
        is_minority_owned BOOLEAN,
        is_family_owned BOOLEAN,
        is_operator_owned BOOLEAN,
        financial_score NUMERIC,
        geography_score NUMERIC,
        semantic_score NUMERIC,
        bonus_score NUMERIC,
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
        -- Locations are stored as "CC:State", so we extract distinct country codes
        SELECT ARRAY(
            SELECT DISTINCT split_part(loc, ':', 1)
            FROM unnest(v_buyer.locations) AS loc
            WHERE loc IS NOT NULL AND loc != ''
        ) INTO v_buyer_countries;

        -- Map country codes to continents for tiered geography scoring
        -- Using the global_countries table which has a continent column
        SELECT ARRAY(
            SELECT DISTINCT gc.continent
            FROM unnest(v_buyer_countries) AS cc
            JOIN global_countries gc ON gc.code = cc
        ) INTO v_buyer_continents;

        RETURN QUERY
        WITH scored AS (
            SELECT
                sl.id AS listing_id,
                sl.seller_anon_name,
                sl.status AS seller_status,
                sl.search_revenue,
                sl.search_ebitda,
                sl.search_ebitda_margin,
                sl.search_revenue_growth_yoy,
                sl.locations,
                sl.keywords,
                sl.categorized_keywords,
                sl.pref_transaction_type,
                sl.is_founder_owned,
                sl.is_female_owned,
                sl.is_minority_owned,
                sl.is_family_owned,
                sl.is_operator_owned,

                -- ==========================================
                -- LAYER 2a: Financial Range Scoring (0-100)
                -- ==========================================
                -- For each metric: 100 if in range, linear decay outside with 20% tolerance
                (SELECT COALESCE(AVG(metric_score), 0) FROM (
                    SELECT CASE
                        WHEN v_buyer.search_revenue_min IS NULL AND v_buyer.search_revenue_max IS NULL THEN NULL
                        WHEN sl.search_revenue IS NULL THEN 0
                        WHEN sl.search_revenue >= COALESCE(v_buyer.search_revenue_min, sl.search_revenue)
                        AND sl.search_revenue <= COALESCE(v_buyer.search_revenue_max, sl.search_revenue) THEN 100
                        WHEN sl.search_revenue < v_buyer.search_revenue_min THEN
                            GREATEST(0, 100 - (((v_buyer.search_revenue_min - sl.search_revenue) /
                                NULLIF(COALESCE(v_buyer.search_revenue_max, v_buyer.search_revenue_min * 2) - v_buyer.search_revenue_min, 1) * 5.0) * 100))
                        ELSE
                            GREATEST(0, 100 - (((sl.search_revenue - v_buyer.search_revenue_max) /
                                NULLIF(COALESCE(v_buyer.search_revenue_max, v_buyer.search_revenue_min * 2) - COALESCE(v_buyer.search_revenue_min, 0), 1) * 5.0) * 100))
                        END AS metric_score
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_ebitda_min IS NULL AND v_buyer.search_ebitda_max IS NULL THEN NULL
                        WHEN sl.search_ebitda IS NULL THEN 0
                        WHEN sl.search_ebitda >= COALESCE(v_buyer.search_ebitda_min, sl.search_ebitda)
                        AND sl.search_ebitda <= COALESCE(v_buyer.search_ebitda_max, sl.search_ebitda) THEN 100
                        WHEN sl.search_ebitda < v_buyer.search_ebitda_min THEN
                            GREATEST(0, 100 - (((v_buyer.search_ebitda_min - sl.search_ebitda) /
                                NULLIF(COALESCE(v_buyer.search_ebitda_max, v_buyer.search_ebitda_min * 2) - v_buyer.search_ebitda_min, 1) * 5.0) * 100))
                        ELSE
                            GREATEST(0, 100 - (((sl.search_ebitda - v_buyer.search_ebitda_max) /
                                NULLIF(COALESCE(v_buyer.search_ebitda_max, v_buyer.search_ebitda_min * 2) - COALESCE(v_buyer.search_ebitda_min, 0), 1) * 5.0) * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_ebitda_margin_min IS NULL AND v_buyer.search_ebitda_margin_max IS NULL THEN NULL
                        WHEN sl.search_ebitda_margin IS NULL THEN 0
                        WHEN sl.search_ebitda_margin >= COALESCE(v_buyer.search_ebitda_margin_min, sl.search_ebitda_margin)
                        AND sl.search_ebitda_margin <= COALESCE(v_buyer.search_ebitda_margin_max, sl.search_ebitda_margin) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_ebitda_margin - COALESCE(v_buyer.search_ebitda_margin_min, v_buyer.search_ebitda_margin_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_gross_profit_min IS NULL AND v_buyer.search_gross_profit_max IS NULL THEN NULL
                        WHEN sl.search_gross_profit IS NULL THEN 0
                        WHEN sl.search_gross_profit >= COALESCE(v_buyer.search_gross_profit_min, sl.search_gross_profit)
                        AND sl.search_gross_profit <= COALESCE(v_buyer.search_gross_profit_max, sl.search_gross_profit) THEN 100
                        WHEN sl.search_gross_profit < v_buyer.search_gross_profit_min THEN
                            GREATEST(0, 100 - (((v_buyer.search_gross_profit_min - sl.search_gross_profit) /
                                NULLIF(COALESCE(v_buyer.search_gross_profit_max, v_buyer.search_gross_profit_min * 2) - v_buyer.search_gross_profit_min, 1) * 5.0) * 100))
                        ELSE
                            GREATEST(0, 100 - (((sl.search_gross_profit - v_buyer.search_gross_profit_max) /
                                NULLIF(COALESCE(v_buyer.search_gross_profit_max, v_buyer.search_gross_profit_min * 2) - COALESCE(v_buyer.search_gross_profit_min, 0), 1) * 5.0) * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_gross_margin_min IS NULL AND v_buyer.search_gross_margin_max IS NULL THEN NULL
                        WHEN sl.search_gross_margin IS NULL THEN 0
                        WHEN sl.search_gross_margin >= COALESCE(v_buyer.search_gross_margin_min, sl.search_gross_margin)
                        AND sl.search_gross_margin <= COALESCE(v_buyer.search_gross_margin_max, sl.search_gross_margin) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_gross_margin - COALESCE(v_buyer.search_gross_margin_min, v_buyer.search_gross_margin_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_ebit_min IS NULL AND v_buyer.search_ebit_max IS NULL THEN NULL
                        WHEN sl.search_ebit IS NULL THEN 0
                        WHEN sl.search_ebit >= COALESCE(v_buyer.search_ebit_min, sl.search_ebit)
                        AND sl.search_ebit <= COALESCE(v_buyer.search_ebit_max, sl.search_ebit) THEN 100
                        WHEN sl.search_ebit < v_buyer.search_ebit_min THEN
                            GREATEST(0, 100 - (((v_buyer.search_ebit_min - sl.search_ebit) /
                                NULLIF(COALESCE(v_buyer.search_ebit_max, v_buyer.search_ebit_min * 2) - v_buyer.search_ebit_min, 1) * 5.0) * 100))
                        ELSE
                            GREATEST(0, 100 - (((sl.search_ebit - v_buyer.search_ebit_max) /
                                NULLIF(COALESCE(v_buyer.search_ebit_max, v_buyer.search_ebit_min * 2) - COALESCE(v_buyer.search_ebit_min, 0), 1) * 5.0) * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_ebit_margin_min IS NULL AND v_buyer.search_ebit_margin_max IS NULL THEN NULL
                        WHEN sl.search_ebit_margin IS NULL THEN 0
                        WHEN sl.search_ebit_margin >= COALESCE(v_buyer.search_ebit_margin_min, sl.search_ebit_margin)
                        AND sl.search_ebit_margin <= COALESCE(v_buyer.search_ebit_margin_max, sl.search_ebit_margin) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_ebit_margin - COALESCE(v_buyer.search_ebit_margin_min, v_buyer.search_ebit_margin_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_net_income_min IS NULL AND v_buyer.search_net_income_max IS NULL THEN NULL
                        WHEN sl.search_net_income IS NULL THEN 0
                        WHEN sl.search_net_income >= COALESCE(v_buyer.search_net_income_min, sl.search_net_income)
                        AND sl.search_net_income <= COALESCE(v_buyer.search_net_income_max, sl.search_net_income) THEN 100
                        WHEN sl.search_net_income < v_buyer.search_net_income_min THEN
                            GREATEST(0, 100 - (((v_buyer.search_net_income_min - sl.search_net_income) /
                                NULLIF(COALESCE(v_buyer.search_net_income_max, v_buyer.search_net_income_min * 2) - v_buyer.search_net_income_min, 1) * 5.0) * 100))
                        ELSE
                            GREATEST(0, 100 - (((sl.search_net_income - v_buyer.search_net_income_max) /
                                NULLIF(COALESCE(v_buyer.search_net_income_max, v_buyer.search_net_income_min * 2) - COALESCE(v_buyer.search_net_income_min, 0), 1) * 5.0) * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_net_margin_min IS NULL AND v_buyer.search_net_margin_max IS NULL THEN NULL
                        WHEN sl.search_net_margin IS NULL THEN 0
                        WHEN sl.search_net_margin >= COALESCE(v_buyer.search_net_margin_min, sl.search_net_margin)
                        AND sl.search_net_margin <= COALESCE(v_buyer.search_net_margin_max, sl.search_net_margin) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_net_margin - COALESCE(v_buyer.search_net_margin_min, v_buyer.search_net_margin_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_revenue_growth_yoy_min IS NULL AND v_buyer.search_revenue_growth_yoy_max IS NULL THEN NULL
                        WHEN sl.search_revenue_growth_yoy IS NULL THEN 0
                        WHEN sl.search_revenue_growth_yoy >= COALESCE(v_buyer.search_revenue_growth_yoy_min, sl.search_revenue_growth_yoy)
                        AND sl.search_revenue_growth_yoy <= COALESCE(v_buyer.search_revenue_growth_yoy_max, sl.search_revenue_growth_yoy) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_revenue_growth_yoy - COALESCE(v_buyer.search_revenue_growth_yoy_min, v_buyer.search_revenue_growth_yoy_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_revenue_cagr_min IS NULL AND v_buyer.search_revenue_cagr_max IS NULL THEN NULL
                        WHEN sl.search_revenue_cagr IS NULL THEN 0
                        WHEN sl.search_revenue_cagr >= COALESCE(v_buyer.search_revenue_cagr_min, sl.search_revenue_cagr)
                        AND sl.search_revenue_cagr <= COALESCE(v_buyer.search_revenue_cagr_max, sl.search_revenue_cagr) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_revenue_cagr - COALESCE(v_buyer.search_revenue_cagr_min, v_buyer.search_revenue_cagr_max)) / 0.05 * 100))
                        END
                    UNION ALL SELECT CASE
                        WHEN v_buyer.search_ebitda_growth_yoy_min IS NULL AND v_buyer.search_ebitda_growth_yoy_max IS NULL THEN NULL
                        WHEN sl.search_ebitda_growth_yoy IS NULL THEN 0
                        WHEN sl.search_ebitda_growth_yoy >= COALESCE(v_buyer.search_ebitda_growth_yoy_min, sl.search_ebitda_growth_yoy)
                        AND sl.search_ebitda_growth_yoy <= COALESCE(v_buyer.search_ebitda_growth_yoy_max, sl.search_ebitda_growth_yoy) THEN 100
                        ELSE GREATEST(0, 100 - (ABS(sl.search_ebitda_growth_yoy - COALESCE(v_buyer.search_ebitda_growth_yoy_min, v_buyer.search_ebitda_growth_yoy_max)) / 0.05 * 100))
                        END
                ) AS sub(metric_score) WHERE metric_score IS NOT NULL
                ) AS financial_score,

                -- ==========================================
                -- LAYER 2b: Geography Scoring (0-100)
                -- ==========================================
                -- Tiered: exact state match=100, same country=50, same continent=50, outside=0
                CASE
                    WHEN v_buyer.locations IS NULL OR array_length(v_buyer.locations, 1) IS NULL THEN 100.0
                    WHEN sl.locations IS NOT NULL AND sl.locations && v_buyer.locations THEN 100.0
                    WHEN sl.locations IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(sl.locations) AS sl_loc
                        WHERE split_part(sl_loc, ':', 1) = ANY(v_buyer_countries)
                    ) THEN 50.0
                    WHEN sl.locations IS NOT NULL AND v_buyer_continents IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(sl.locations) AS sl_loc
                        JOIN global_countries gc ON gc.code = split_part(sl_loc, ':', 1)
                        WHERE gc.continent = ANY(v_buyer_continents)
                    ) THEN 50.0
                    ELSE 0.0
                END AS geography_score,

                -- ==========================================
                -- LAYER 3: Semantic Scoring (0-100)
                -- ==========================================
                -- Cosine similarity from pgvector, scaled to 0-100
                CASE
                    WHEN v_buyer.embedding IS NULL OR sl.embedding IS NULL THEN 0.0
                    ELSE GREATEST(0, (1.0 - (sl.embedding <=> v_buyer.embedding)) * 100.0)
                END AS semantic_score,

                -- ==========================================
                -- BONUS: Ownership flags + extras
                -- ==========================================
                (
                    CASE WHEN v_buyer.require_founder_owned = true AND sl.is_founder_owned = true THEN 2 ELSE 0 END +
                    CASE WHEN v_buyer.require_female_owned = true AND sl.is_female_owned = true THEN 2 ELSE 0 END +
                    CASE WHEN v_buyer.require_minority_owned = true AND sl.is_minority_owned = true THEN 2 ELSE 0 END +
                    CASE WHEN v_buyer.require_family_owned = true AND sl.is_family_owned = true THEN 2 ELSE 0 END +
                    CASE WHEN v_buyer.require_operator_owned = true AND sl.is_operator_owned = true THEN 2 ELSE 0 END +
                    -- Transaction type depth: +2 if multiple types overlap
                    CASE WHEN v_buyer.pref_transaction_type IS NOT NULL AND sl.pref_transaction_type IS NOT NULL
                        AND (SELECT COUNT(*) FROM unnest(v_buyer.pref_transaction_type) vt WHERE vt = ANY(sl.pref_transaction_type)) > 1
                        THEN 2 ELSE 0 END +
                    -- NAICS depth: +3 if matching at 3-digit subsector
                    CASE WHEN v_buyer.naics_codes IS NOT NULL AND sl.naics_codes IS NOT NULL
                        AND EXISTS (
                            SELECT 1 FROM unnest(v_buyer.naics_codes) bn, unnest(sl.naics_codes) sn
                            WHERE length(bn) >= 3 AND length(sn) >= 3 AND left(bn, 3) = left(sn, 3)
                        )
                        THEN 3 ELSE 0 END
                )::NUMERIC AS bonus_score

            FROM seller_listings sl
            WHERE sl.status = 'Active'

            -- ==========================================
            -- LAYER 1: Hard Filters
            -- ==========================================
            -- Transaction type overlap (skip if buyer has no preference)
            AND (
                v_buyer.pref_transaction_type IS NULL
                OR array_length(v_buyer.pref_transaction_type, 1) IS NULL
                OR sl.pref_transaction_type && v_buyer.pref_transaction_type
            )
            -- NAICS code overlap at prefix level (skip if buyer has no codes)
            AND (
                v_buyer.naics_codes IS NULL
                OR array_length(v_buyer.naics_codes, 1) IS NULL
                OR EXISTS (
                    SELECT 1 FROM unnest(v_buyer.naics_codes) bn, unnest(sl.naics_codes) sn
                    WHERE sn LIKE bn || '%' OR bn LIKE sn || '%'
                )
            )
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
            ROUND(s.financial_score, 1) AS financial_score,
            ROUND(s.geography_score, 1) AS geography_score,
            ROUND(s.semantic_score, 1) AS semantic_score,
            ROUND(s.bonus_score, 1) AS bonus_score,
            -- Final score: 0.45 * (financial + geography blend) + 0.55 * semantic + bonus
            ROUND(
                0.45 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
                + 0.55 * s.semantic_score
                + s.bonus_score
            , 1) AS total_score,
            -- Tier classification
            CASE
                WHEN (0.45 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
                    + 0.55 * s.semantic_score + s.bonus_score) >= 70 THEN 'Strong'
                WHEN (0.45 * ((COALESCE(NULLIF(s.financial_score, 0), 50) * 0.7) + (s.geography_score * 0.3))
                    + 0.55 * s.semantic_score + s.bonus_score) >= 40 THEN 'Moderate'
                ELSE 'Weak'
            END AS match_tier
        FROM scored s
        ORDER BY total_score DESC;
    END;
    $$ LANGUAGE plpgsql STABLE;
