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
   * Updates specific columns of an existing listing without triggering insert-time constraint checks.
   */
  async updateListing(id, updates) {
    const { data, error } = await supabase
      .from('seller_listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a seller listing and its associated storage files.
   */
  async deleteListing(listingId) {
    // 1. Fetch listing to get file paths
    try {
      const { data: listing } = await supabase
        .from('seller_listings')
        .select('teaser_url, cim_url')
        .eq('id', listingId)
        .single();

      if (listing) {
        const filesToDelete = [];
        if (listing.teaser_url) filesToDelete.push(listing.teaser_url);
        if (listing.cim_url) filesToDelete.push(listing.cim_url);

        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('listing_documents')
            .remove(filesToDelete);
        }
      }
    } catch (err) {
      console.warn('Failed to clean up files during listing deletion:', err);
    }

    // 2. Delete database entry
    const { error } = await supabase
      .from('seller_listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
    return true;
  },

  /**
   * Uploads a listing document (teaser/cim) to Supabase Storage.
   */
  async uploadListingDocument(listingId, file, type) {
    const fileExt = file.name.split('.').pop();
    const path = `listings/${listingId}/${type}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('listing_documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data.path; // Returns the storage path to store in the DB
  },

  /**
   * Deletes a document from Supabase Storage.
   */
  async deleteListingDocument(path) {
    const { error } = await supabase.storage
      .from('listing_documents')
      .remove([path]);

    if (error) throw error;
    return true;
  },

  /**
   * Generates a signed URL to download or view a private listing document.
   */
  async getSignedUrl(path, expirySeconds = 60) {
    const { data, error } = await supabase.storage
      .from('listing_documents')
      .createSignedUrl(path, expirySeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Fetches a listing by ID for buyer-facing display.
   * Only returns buyer-safe fields — never seller_name (real identity).
   */
  async getPublicListingById(id) {
    if (!id) throw new Error('Listing ID is required');

    const { data, error } = await supabase
      .from('seller_listings')
      .select(
        'id, seller_anon_name, summary, year_founded, employees_count, legal_entity, ' +
        'ownership_structure, is_founder_owned, is_female_owned, is_minority_owned, ' +
        'is_family_owned, is_operator_owned, keywords, locations, pref_transaction_type, ' +
        'financial_history, categorized_keywords, teaser_url, teaser_file_name, ' +
        'search_revenue, search_ebitda, search_ebitda_margin, search_gross_profit, ' +
        'search_revenue_growth_yoy, status, created_at'
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};
