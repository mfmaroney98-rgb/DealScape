import { supabase } from '../lib/supabase';

/**
 * Service to manage user profiles.
 */
export const profileService = {
  /**
   * Fetches the profile for the current user.
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, organizations(id, name, type)')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  /**
   * Updates or creates a profile for the current user.
   */
  async updateProfile(profile) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Sets the user's role (buyer/seller).
   */
  async setRole(userId, role) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        role, 
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
