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

    // 2. Link Profile to Organization using upsert to ensure record exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        organization_id: org.id,
        updated_at: new Date().toISOString()
      });

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
