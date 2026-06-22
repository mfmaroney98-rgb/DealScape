import { supabase } from '../lib/supabase';

/**
 * Service to manage the AI match cache table.
 * Caches LLM qualitative scores per (buyer_criteria_id, listing_id)
 * to avoid redundant API calls.
 */
export const cacheService = {
  /**
   * Fetch cached AI scores for a criteria + set of listing IDs.
   * Returns a Map of listing_id -> { ai_score, ai_reasoning }.
   */
  async getCachedScores(criteriaId, listingIds) {
    if (!criteriaId || !listingIds?.length) return new Map();

    const { data, error } = await supabase
      .from('ai_match_cache')
      .select('listing_id, ai_score, ai_reasoning')
      .eq('buyer_criteria_id', criteriaId)
      .in('listing_id', listingIds);

    if (error) {
      console.error('Cache read error:', error);
      return new Map();
    }

    const cacheMap = new Map();
    (data || []).forEach(row => {
      cacheMap.set(row.listing_id, {
        ai_score: row.ai_score,
        ai_reasoning: row.ai_reasoning
      });
    });

    return cacheMap;
  },

  /**
   * Write AI scores to the cache. Uses upsert to handle re-runs gracefully.
   * @param {string} criteriaId - Buyer criteria UUID
   * @param {Array<{listing_id: string, ai_score: number, ai_reasoning: string}>} scores
   */
  async writeCachedScores(criteriaId, scores) {
    if (!criteriaId || !scores?.length) return;

    const rows = scores.map(s => ({
      buyer_criteria_id: criteriaId,
      listing_id: s.listing_id,
      ai_score: s.ai_score,
      ai_reasoning: s.ai_reasoning,
      model_used: 'gpt-4o-mini'
    }));

    const { error } = await supabase
      .from('ai_match_cache')
      .upsert(rows, { onConflict: 'buyer_criteria_id,listing_id' });

    if (error) {
      console.error('Cache write error:', error);
    }
  },

  /**
   * Invalidate all cached scores for a specific criteria.
   * Useful when buyer criteria are updated.
   */
  async invalidateCriteriaCache(criteriaId) {
    if (!criteriaId) return;

    const { error } = await supabase
      .from('ai_match_cache')
      .delete()
      .eq('buyer_criteria_id', criteriaId);

    if (error) {
      console.error('Cache invalidation error:', error);
    }
  }
};
