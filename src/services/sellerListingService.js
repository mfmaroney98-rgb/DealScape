import { supabase } from '../lib/supabase';

/**
 * Service to manage seller listings and profiles.
 * Renamed from sellerService for consistency with backend.
 */
export const sellerListingService = {
  /**
   * Fetches the listings for a specific organization.
   * If isCorporate is true, it fetches all listings.
   */
  async getListings(orgId, isCorporate = false) {
    let query = supabase
      .from('seller_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isCorporate) {
      if (!orgId) return [];
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches a specific listing by its ID, ensuring it belongs to the organization (unless corporate).
   */
  async getListingById(id, orgId, isCorporate = false) {
    let query = supabase
      .from('seller_listings')
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
   * Creates or updates a seller listing.
   */
  async saveListing(listingData) {
    const { data, error } = await supabase
      .from('seller_listings')
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
      .from('seller_listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
    return true;
  }
};
