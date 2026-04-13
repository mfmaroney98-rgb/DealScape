import { supabase } from '../lib/supabase';

/**
 * Service to manage buyer search criteria.
 */
export const buyerService = {
  /**
   * Fetches all search criteria for a specific user.
   */
  async getCriteriaList(userId) {
    const { data, error } = await supabase
      .from('buyer_criteria')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetches a specific search criteria record by ID.
   */
  async getCriteriaById(id) {
    const { data, error } = await supabase
      .from('buyer_criteria')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates or updates buyer search criteria.
   */
  async saveCriteria(criteriaData) {
    const { data, error } = await supabase
      .from('buyer_criteria')
      .upsert({
        ...criteriaData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes buyer criteria.
   */
  async deleteCriteria(criteriaId) {
    const { error } = await supabase
      .from('buyer_criteria')
      .delete()
      .eq('id', criteriaId);

    if (error) throw error;
    return true;
  }
};
