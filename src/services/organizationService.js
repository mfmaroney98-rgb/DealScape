import { supabase } from '../lib/supabase';

/**
 * Service to manage organizations.
 */
export const organizationService = {
  /**
   * Fetches internal organization details.
   */
  async getOrganization(orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new organization and links it to the profile.
   */
  async createOrganization(name, type, userId) {
    // 1. Create Organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, type })
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Link Profile to Organization
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: org.id })
      .eq('id', userId);

    if (profileError) throw profileError;

    return org;
  },

  /**
   * Updates organization details.
   */
  async updateOrganization(orgId, updates) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
