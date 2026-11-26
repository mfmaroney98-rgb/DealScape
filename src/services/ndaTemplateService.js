import { supabase } from '../lib/supabase';

/**
 * Computes SHA-256 hex digest of a File or Blob in the browser using Web Crypto API.
 */
export async function computeFileSha256(fileOrBlob) {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const ndaTemplateService = {
  /**
   * Lists active (non-archived) NDA templates for an organization.
   */
  async getOrgTemplates(orgId) {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('organization_nda_templates')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_archived', false)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Uploads a PDF NDA template for an organization and creates its database record.
   */
  async uploadOrgTemplate({ orgId, userId, name, file, isDefault = false }) {
    if (!orgId || !file) throw new Error('Organization ID and file are required');

    const sha256 = await computeFileSha256(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `templates/${orgId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('nda_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // If this template is marked default, clear existing default first to satisfy unique index.
    if (isDefault) {
      await supabase
        .from('organization_nda_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('organization_id', orgId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('organization_nda_templates')
      .insert({
        organization_id: orgId,
        name: name?.trim() || file.name.replace(/\.pdf$/i, ''),
        file_path: filePath,
        file_name: file.name,
        file_sha256: sha256,
        is_default: isDefault,
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from('nda_documents').remove([filePath]).catch(() => {});
      throw error;
    }

    return data;
  },

  /**
   * Sets a template as the organization's default NDA template.
   */
  async setDefaultTemplate(orgId, templateId) {
    await supabase
      .from('organization_nda_templates')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('is_default', true);

    const { data, error } = await supabase
      .from('organization_nda_templates')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Archives an NDA template (soft delete so historical nda_requests remain intact).
   */
  async archiveTemplate(orgId, templateId) {
    const { error } = await supabase
      .from('organization_nda_templates')
      .update({
        is_archived: true,
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('organization_id', orgId);

    if (error) throw error;
    return true;
  },

  /**
   * Uploads a listing-specific custom NDA PDF to nda_documents.
   */
  async uploadListingCustomNda(listingId, file) {
    if (!listingId || !file) throw new Error('Listing ID and file are required');
    const sha256 = await computeFileSha256(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `listing-custom/${listingId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('nda_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return {
      path: filePath,
      fileName: file.name,
      sha256,
    };
  },

  /**
   * Returns a short-lived signed URL for an NDA document in nda_documents.
   */
  async getSignedUrl(filePath, expirySeconds = 120) {
    const { data, error } = await supabase.storage
      .from('nda_documents')
      .createSignedUrl(filePath, expirySeconds);

    if (error) throw error;
    return data.signedUrl;
  },
};
