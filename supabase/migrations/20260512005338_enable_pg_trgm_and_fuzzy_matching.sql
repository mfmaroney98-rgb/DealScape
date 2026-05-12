-- Enable pg_trgm for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

/**
 * Calculates the average maximum similarity between two sets of tags.
 * For each tag in the buyer's set, it finds the most similar tag in the seller's set.
 */
CREATE OR REPLACE FUNCTION calculate_fuzzy_overlap(p_buyer_tags JSONB, p_seller_tags JSONB)
RETURNS NUMERIC AS $$
DECLARE
    v_b_tag TEXT;
    v_s_tag TEXT;
    v_max_sim NUMERIC := 0;
    v_total_sim NUMERIC := 0;
    v_count INTEGER := 0;
BEGIN
    -- If buyer has no tags in this bucket, it's a neutral match
    IF p_buyer_tags IS NULL OR jsonb_array_length(p_buyer_tags) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- If buyer has tags but seller doesn't, it's a poor keyword match
    IF p_seller_tags IS NULL OR jsonb_array_length(p_seller_tags) = 0 THEN
        RETURN 0;
    END IF;

    -- For each buyer tag, find the best fuzzy match in the seller's tags
    FOR v_b_tag IN SELECT jsonb_array_elements_text(p_buyer_tags) LOOP
        v_max_sim := 0;
        FOR v_s_tag IN SELECT jsonb_array_elements_text(p_seller_tags) LOOP
            -- similarity() returns 0 to 1
            v_max_sim := GREATEST(v_max_sim, similarity(v_b_tag, v_s_tag));
        END LOOP;
        v_total_sim := v_total_sim + v_max_sim;
        v_count := v_count + 1;
    END LOOP;

    RETURN (v_total_sim / v_count) * 100;
END;
$$ LANGUAGE plpgsql STABLE;
