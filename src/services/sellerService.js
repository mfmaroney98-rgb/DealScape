import { supabase } from '../lib/supabase';

/**
 * Service to manage seller listings and profiles.
 */
export const sellerService = {
  /**
   * Fetches the listing for a specific seller.
   */
  async getListing(userId) {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Creates or updates a seller listing.
   */
  async saveListing(listingData) {
    const { data, error } = await supabase
      .from('sellers')
      .upsert({
        ...listingData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a seller listing.
   */
  async deleteListing(listingId) {
    const { error } = await supabase
      .from('sellers')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
    return true;
  }
};
