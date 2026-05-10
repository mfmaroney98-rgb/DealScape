import { supabase } from '../lib/supabase';

export const matchingService = {
  /**
   * Invokes the match_listings_for_criteria RPC function.
   * Returns a list of seller listings scored against the provided criteria.
   */
  async getMatchesForCriteria(criteriaId) {
    if (!criteriaId) throw new Error('Criteria ID is required');

    const { data, error } = await supabase.rpc('match_listings_for_criteria', {
      p_criteria_id: criteriaId
    });

    if (error) {
      console.error('Matching Engine Error:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Helper to group matches by tier for UI display.
   */
  groupMatchesByTier(matches) {
    return {
      Strong: matches.filter(m => m.match_tier === 'Strong'),
      Moderate: matches.filter(m => m.match_tier === 'Moderate'),
      Weak: matches.filter(m => m.match_tier === 'Weak')
    };
  }
};
