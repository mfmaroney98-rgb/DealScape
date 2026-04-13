import { supabase } from '../lib/supabase';

/**
 * Service to manage buyer search criteria.
 */
export const buyerService = {
  /**
   * Fetches all search criteria for a specific organization.
   * If isCorporate is true, it fetches all criteria.
   */
  async getCriteriaList(orgId, isCorporate = false) {
    let query = supabase
      .from('buyer_criteria')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isCorporate) {
      if (!orgId) return [];
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Fetches a specific search criteria record by ID.
   */
  async getCriteriaById(id, orgId, isCorporate = false) {
    let query = supabase
      .from('buyer_criteria')
      .select('*')
      .eq('id', id);

    if (!isCorporate) {
      if (!orgId) throw new Error('Organization ID is required');
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query.single();

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
