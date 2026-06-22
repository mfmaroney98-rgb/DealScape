import { supabase } from '../lib/supabase';
import { aiService } from './aiService';

export const matchingService = {
  /**
   * Stage 1: Get the top N initial candidate matches using a discrete SQL scoring system.
   * Runs the Supabase RPC get_stage1_candidates.
   *
   * @param {string} criteriaId - The buyer criteria UUID
   * @param {number} limit - Max number of candidates to return
   * @returns {Promise<Array>}
   */
  async getStage1Candidates(criteriaId, limit = 50) {
    if (!criteriaId) throw new Error('Criteria ID is required');

    const { data, error } = await supabase.rpc('get_stage1_candidates', {
      p_criteria_id: criteriaId,
      p_limit: limit
    });

    if (error) {
      console.error('[Stage 1] SQL scoring error:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Two-Stage Matching Orchestrator:
   * 1. Run Stage 1 (SQL scoring) to get top N candidates.
   * 2. Run Stage 2 (AI qualitative fit) on the candidates.
   * 3. Compute final weighted score: 40% Stage 1 + 60% Stage 2 (AI score).
   * 4. Re-sort candidates by final score and determine final tier.
   *
   * @param {string} criteriaId - The buyer criteria UUID
   * @param {Object} buyerCriteria - The buyer criteria record
   * @param {number} limit - Max candidates to score with AI
   * @returns {Promise<Array>}
   */
  async getTwoStageMatches(criteriaId, buyerCriteria, limit = 50) {
    if (!criteriaId) throw new Error('Criteria ID is required');

    // 1. Get Stage 1 candidates
    const candidates = await this.getStage1Candidates(criteriaId, limit);
    if (candidates.length === 0) return [];

    // 2. Score candidates with AI (Stage 2)
    const aiScores = await aiService.scoreMatchesWithAI(buyerCriteria, candidates, criteriaId);
    const aiMap = new Map(aiScores.map(item => [item.listing_id, item]));

    // 3. Compute final scores and update matches
    const matches = candidates.map(c => {
      const aiObj = aiMap.get(c.listing_id) || { ai_score: 0, ai_reasoning: '' };
      
      const s1Score = Number(c.stage1_score) || 0;
      const aiScore = Number(aiObj.ai_score) || 0;
      
      // Final Score = 40% Stage 1 + 60% AI Score
      const finalScore = Math.round((0.4 * s1Score + 0.6 * aiScore) * 10) / 10;
      
      // Determine match tier
      let tier;
      if (finalScore >= 75) {
        tier = 'Strong';
      } else if (finalScore >= 45) {
        tier = 'Moderate';
      } else {
        tier = 'Weak';
      }

      return {
        ...c,
        stage1_score: s1Score,
        ai_score: aiScore,
        ai_reasoning: aiObj.ai_reasoning,
        total_score: finalScore,
        match_tier: tier,
        // Map AI score to legacy fields so existing UI doesn't break if it reads them
        semantic_score: aiScore,
        industry_fit_score: aiScore,
        bonus_score: 0,
        bonus_reasons: []
      };
    });

    // 4. Sort by final score descending
    matches.sort((a, b) => b.total_score - a.total_score);
    return matches;
  },

  /**
   * Invokes the match_listings_for_criteria RPC function (Legacy single-pass engine).
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
