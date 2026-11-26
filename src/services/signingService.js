import { supabase } from '../lib/supabase';

/**
 * Provider-agnostic signing abstraction.
 * v1 uses `internal_v1` (in-app PDF review + ESIGN consent + server-side Certificate of Completion).
 * For commercial launch, swap these methods to call Dropbox Sign / DocuSign Edge Functions
 * without touching the NDA workflow or database state machine.
 */
export const signingService = {
  /**
   * Initializes a signing request for an nda_requests record.
   */
  async createSigningRequest({ ndaRequestId }) {
    const { data, error } = await supabase
      .from('nda_requests')
      .select('id, signing_provider, source_nda_path, status')
      .eq('id', ndaRequestId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Returns either an embedded third-party signing URL or the internal_v1 PDF signed URL.
   */
  async getEmbeddedSignUrl({ ndaRequestId }) {
    const { data: req, error } = await supabase
      .from('nda_requests')
      .select('*')
      .eq('id', ndaRequestId)
      .single();

    if (error) throw error;

    const { data: signed, error: urlError } = await supabase.storage
      .from('nda_documents')
      .createSignedUrl(req.source_nda_path, 300);

    if (urlError) throw urlError;

    return {
      provider: req.signing_provider || 'internal_v1',
      url: signed.signedUrl,
      ndaRequest: req,
    };
  },

  /**
   * Submits an internal_v1 electronic signature via the authoritative `sign-nda` Edge Function.
   */
  async submitInternalSignature({
    ndaRequestId,
    role,
    signerName,
    signerTitle,
    signatureText,
    esignConsent,
  }) {
    const { data, error } = await supabase.functions.invoke('sign-nda', {
      body: {
        ndaRequestId,
        role,
        signerName,
        signerTitle,
        signatureText,
        esignConsent,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to submit signature');
    }
    if (data?.error) {
      throw new Error(data.error);
    }

    return data.ndaRequest;
  },

  /**
   * Placeholder for commercial launch webhook handling (Dropbox Sign / DocuSign).
   */
  async onSignedWebhook() {
    throw new Error('External provider webhooks are handled server-side via Edge Functions.');
  },

  /**
   * Returns a short-lived signed URL to download or view the executed NDA PDF.
   */
  async getExecutedPdf({ ndaRequestId, expirySeconds = 120 }) {
    const { data: req, error } = await supabase
      .from('nda_requests')
      .select('executed_pdf_path, source_nda_path')
      .eq('id', ndaRequestId)
      .single();

    if (error) throw error;
    const targetPath = req.executed_pdf_path || req.source_nda_path;
    if (!targetPath) throw new Error('No executed NDA document found');

    const { data, error: signError } = await supabase.storage
      .from('nda_documents')
      .createSignedUrl(targetPath, expirySeconds);

    if (signError) throw signError;
    return data.signedUrl;
  },
};
