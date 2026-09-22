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
      .eq('archived', false)
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
      .eq('id', id)
      .eq('archived', false);

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
      .update({
        archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', criteriaId);

    if (error) throw error;
    return true;
  },

  /**
   * Uploads a criteria overview document to Supabase Storage (organization_documents bucket).
   */
  async uploadCriteriaDocument(criteriaId, file) {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `criteria/${criteriaId || 'temp'}/${Date.now()}_${cleanFileName}`;

    const { error } = await supabase.storage
      .from('organization_documents')
      .upload(storagePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('organization_documents')
      .getPublicUrl(storagePath);

    return {
      url: publicUrlData?.publicUrl || '',
      fileName: file.name
    };
  }
};
