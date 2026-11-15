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
      .insert({ organization_name: name, type })
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Link Profile to Organization using upsert to ensure record exists
    const { error: profileError } = await supabase
      .from('user_profiles')
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
  },

  /**
   * Fetches divisions for an organization.
   */
  async getDivisions(orgId) {
    const org = await this.getOrganization(orgId);
    return org.divisions || [];
  },

  /**
   * Adds a new division to an organization.
   */
  async createDivision(orgId, name) {
    const org = await this.getOrganization(orgId);
    const divisions = org.divisions || [];
    if (!divisions.includes(name)) {
      divisions.push(name);
      await this.updateOrganization(orgId, { divisions });
    }
    return name;
  },

  /**
   * Fetches all organizations of type 'buyer'.
   */
  async getBuyerOrganizations() {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, organization_name, type, buyer_type')
      .eq('type', 'buyer')
      .order('organization_name', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all users belonging to an organization, sorted A-Z by first name.
   */
  async getOrganizationUsers(orgId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name, first_name, last_name, email, title, role, organization_id, created_at, updated_at')
      .eq('organization_id', orgId);

    if (error) throw error;
    return (data || []).sort((a, b) => {
      const aName = (a.first_name || a.name || a.email || '').trim().toLowerCase();
      const bName = (b.first_name || b.name || b.email || '').trim().toLowerCase();
      return aName.localeCompare(bName);
    });
  },

  /**
   * Manually adds a user to an organization.
   */
  async addOrganizationUser(orgId, { firstName, lastName, email, title, role = 'seller' }) {
    const cleanFirst = firstName?.trim() || null;
    const cleanLast = lastName?.trim() || null;
    const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ') || null;

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        organization_id: orgId,
        first_name: cleanFirst,
        last_name: cleanLast,
        name: fullName,
        email: email?.trim() || null,
        title: title?.trim() || null,
        role,
        updated_at: new Date().toISOString()
      })
      .select('id, name, first_name, last_name, email, title, role, organization_id, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Removes a user from an organization.
   */
  async removeOrganizationUser(userId) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      // Fallback: if user is referenced by listings/criteria, unlink from organization
      const { error: unlinkError } = await supabase
        .from('user_profiles')
        .update({ organization_id: null, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (unlinkError) throw error;
    }
    return true;
  }
};
