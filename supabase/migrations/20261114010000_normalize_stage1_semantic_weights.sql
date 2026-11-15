-- Dynamically normalize Stage 1 semantic_score weights across whichever
-- segmented embeddings the buyer_criteria row actually has populated.

CREATE OR REPLACE FUNCTION public.get_stage1_candidates(
    p_criteria_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    listing_id uuid,
    seller_anon_name text,
    summary text,
    seller_status text,
    search_revenue numeric,
    search_ebitda numeric,
    search_ebitda_margin numeric,
    search_revenue_growth_yoy numeric,
    locations text[],
    keywords text,
    categorized_keywords jsonb,
    pref_transaction_type text[],
    is_founder_owned boolean,
    is_female_owned boolean,
    is_minority_owned boolean,
    is_family_owned boolean,
    is_operator_owned boolean,
    owner_transition text,
    financial_score numeric,
    geography_score numeric,
    industry_score numeric,
    stage1_score numeric,
    total_score numeric,
    match_tier text
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_buyer RECORD;
    v_buyer_countries text[];
BEGIN
    SELECT * INTO v_buyer FROM public.buyer_criteria WHERE id = p_criteria_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Buyer criteria % not found', p_criteria_id;
    END IF;

    SELECT ARRAY(
        SELECT DISTINCT split_part(loc, ':', 1)
        FROM unnest(v_buyer.locations) AS loc
        WHERE loc IS NOT NULL AND loc != ''
    ) INTO v_buyer_countries;

    RETURN QUERY
    WITH calculated_scores AS (
        SELECT
            sl.id AS v_listing_id,
            sl.seller_anon_name,
            sl.summary,
            sl.status::text AS v_seller_status,
            sl.search_revenue,
            sl.search_ebitda,
            sl.search_ebitda_margin,
            sl.search_revenue_growth_yoy,
            sl.locations,
            sl.keywords,
            sl.categorized_keywords,
            sl.pref_transaction_type::text[] AS v_pref_transaction_type,
            sl.is_founder_owned,
            sl.is_female_owned,
            sl.is_minority_owned,
            sl.is_family_owned,
            sl.is_operator_owned,
            sl.owner_transition,

            COALESCE((
                SELECT AVG(metric_score) FROM (
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
            ), 100.0) AS financial_score,

            CASE
                WHEN v_buyer.locations IS NULL OR array_length(v_buyer.locations, 1) IS NULL THEN 100.0
                WHEN sl.locations IS NOT NULL AND sl.locations && v_buyer.locations THEN 100.0
                WHEN sl.locations IS NOT NULL AND EXISTS (
                    SELECT 1 FROM unnest(sl.locations) AS sl_loc
                    WHERE split_part(sl_loc, ':', 1) = ANY(v_buyer_countries)
                ) THEN 50.0
                ELSE 0.0
            END AS geography_score,

            COALESCE(calculate_naics_match_bonus(v_buyer.naics_codes, sl.naics_codes), 100.0) AS industry_score,

            -- Dynamically normalized Segmented Vector Similarity across populated buyer embeddings
            COALESCE(
                (
                    (CASE
                        WHEN v_buyer.embedding_industry IS NOT NULL THEN 0.60 * (
                            CASE WHEN sl.embedding_industry IS NULL THEN 50.0
                                 ELSE LEAST(100.0, GREATEST(0.0, ((1.0 - (sl.embedding_industry <=> v_buyer.embedding_industry)) - 0.25) / 0.75 * 100.0))
                            END
                        )
                        ELSE 0.0
                    END) +
                    (CASE
                        WHEN v_buyer.embedding_model IS NOT NULL THEN 0.25 * (
                            CASE WHEN sl.embedding_model IS NULL THEN 50.0
                                 ELSE LEAST(100.0, GREATEST(0.0, ((1.0 - (sl.embedding_model <=> v_buyer.embedding_model)) - 0.25) / 0.75 * 100.0))
                            END
                        )
                        ELSE 0.0
                    END) +
                    (CASE
                        WHEN v_buyer.embedding_target IS NOT NULL THEN 0.15 * (
                            CASE WHEN sl.embedding_target IS NULL THEN 50.0
                                 ELSE LEAST(100.0, GREATEST(0.0, ((1.0 - (sl.embedding_target <=> v_buyer.embedding_target)) - 0.25) / 0.75 * 100.0))
                            END
                        )
                        ELSE 0.0
                    END)
                ) / NULLIF(
                    (CASE WHEN v_buyer.embedding_industry IS NOT NULL THEN 0.60 ELSE 0.0 END) +
                    (CASE WHEN v_buyer.embedding_model IS NOT NULL THEN 0.25 ELSE 0.0 END) +
                    (CASE WHEN v_buyer.embedding_target IS NOT NULL THEN 0.15 ELSE 0.0 END),
                    0.0
                ),
                50.0
            ) AS semantic_score

        FROM public.seller_listings sl
        WHERE sl.status = 'Active'::public.listing_status
        AND (
            v_buyer.pref_transaction_type IS NULL
            OR array_length(v_buyer.pref_transaction_type, 1) IS NULL
            OR sl.pref_transaction_type IS NULL
            OR array_length(sl.pref_transaction_type, 1) IS NULL
            OR sl.pref_transaction_type && v_buyer.pref_transaction_type
        )
    )
    SELECT
        c.v_listing_id AS listing_id,
        c.seller_anon_name,
        c.summary,
        c.v_seller_status AS seller_status,
        c.search_revenue,
        c.search_ebitda,
        c.search_ebitda_margin,
        c.search_revenue_growth_yoy,
        c.locations,
        c.keywords,
        c.categorized_keywords,
        c.v_pref_transaction_type AS pref_transaction_type,
        c.is_founder_owned,
        c.is_female_owned,
        c.is_minority_owned,
        c.is_family_owned,
        c.is_operator_owned,
        c.owner_transition,
        ROUND(c.financial_score::numeric, 1) AS financial_score,
        ROUND(c.geography_score::numeric, 1) AS geography_score,
        ROUND(c.industry_score::numeric, 1) AS industry_score,

        ROUND(
            (0.35 * c.financial_score +
             0.25 * c.geography_score +
             0.20 * c.industry_score +
             0.20 * c.semantic_score)::numeric
        , 1) AS stage1_score,

        ROUND(
            (0.35 * c.financial_score +
             0.25 * c.geography_score +
             0.20 * c.industry_score +
             0.20 * c.semantic_score)::numeric
        , 1) AS total_score,

        CASE
            WHEN (0.35 * c.financial_score +
                  0.25 * c.geography_score +
                  0.20 * c.industry_score +
                  0.20 * c.semantic_score) >= 75 THEN 'Strong'
            WHEN (0.35 * c.financial_score +
                  0.25 * c.geography_score +
                  0.20 * c.industry_score +
                  0.20 * c.semantic_score) >= 45 THEN 'Moderate'
            ELSE 'Weak'
        END::text AS match_tier

    FROM calculated_scores c
    WHERE c.geography_score > 0
      AND c.industry_score > 0
    ORDER BY stage1_score DESC
    LIMIT p_limit;
END;
$$;
