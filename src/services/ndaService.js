import { supabase } from '../lib/supabase';
import { computeFileSha256 } from './ndaTemplateService';

async function appendAuditEvent({
  ndaRequestId,
  eventType,
  actorUserId,
  actorOrgId,
  actorEmail,
  documentSha256 = null,
  metadata = {},
}) {
  const { error } = await supabase.from('nda_audit_events').insert({
    nda_request_id: ndaRequestId,
    event_type: eventType,
    actor_user_id: actorUserId || null,
    actor_org_id: actorOrgId || null,
    actor_email: actorEmail || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    document_sha256: documentSha256,
    metadata,
  });

  if (error) {
    console.warn('Failed to append NDA audit event:', error);
  }
}

export const ndaService = {
  /**
   * Fetches the latest NDA request for a buyer organization on a specific listing.
   */
  async getBuyerNdaForListing(listingId, buyerOrgId) {
    if (!listingId || !buyerOrgId) return null;

    const { data, error } = await supabase
      .from('nda_requests')
      .select('*')
      .eq('listing_id', listingId)
      .eq('buyer_org_id', buyerOrgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all NDA requests for a listing (seller view), enriched with buyer organization details.
   */
  async getSellerListingNdaRequests(listingId) {
    if (!listingId) return [];

    const { data: requests, error } = await supabase
      .from('nda_requests')
      .select('*')
      .eq('listing_id', listingId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!requests || requests.length === 0) return [];

    const buyerOrgIds = [...new Set(requests.map((r) => r.buyer_org_id).filter(Boolean))];
    const userIds = [
      ...new Set(
        requests
          .flatMap((r) => [r.requested_by_user_id, r.buyer_signer_user_id, r.seller_signer_user_id])
          .filter(Boolean)
      ),
    ];

    const [{ data: orgs }, { data: users }] = await Promise.all([
      buyerOrgIds.length
        ? supabase
            .from('organizations')
            .select('id, organization_name, buyer_type, website_url, headquarters, organization_summary')
            .in('id', buyerOrgIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase
            .from('user_profiles')
            .select('id, name, first_name, last_name, email, title')
            .in('id', userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const orgMap = Object.fromEntries((orgs || []).map((o) => [o.id, o]));
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    return requests.map((r) => ({
      ...r,
      buyer_org: orgMap[r.buyer_org_id] || null,
      requested_by: userMap[r.requested_by_user_id] || null,
    }));
  },

  /**
   * Buyer initiates an NDA request (or immediately enters awaiting_buyer_signature if Instant NDA is enabled).
   * Requires the listing to have either nda_template_id or custom_nda_path configured.
   */
  async requestNda({ listing, buyerOrgId, userId, userEmail, note = '' }) {
    if (!listing?.id || !buyerOrgId) {
      throw new Error('Listing and buyer organization are required');
    }

    // Resolve NDA source document (no DealScape fallback)
    let sourcePath = listing.custom_nda_path || null;
    let sourceFileName = listing.custom_nda_file_name || null;
    let sourceSha256 = listing.custom_nda_sha256 || null;

    if (!sourcePath && listing.nda_template_id) {
      const { data: tpl, error: tplErr } = await supabase
        .from('organization_nda_templates')
        .select('file_path, file_name, file_sha256')
        .eq('id', listing.nda_template_id)
        .single();
      if (tplErr || !tpl) {
        throw new Error('The NDA template assigned to this listing could not be loaded.');
      }
      sourcePath = tpl.file_path;
      sourceFileName = tpl.file_name;
      sourceSha256 = tpl.file_sha256;
    }

    if (!sourcePath) {
      throw new Error('The seller has not configured an NDA template for this listing yet.');
    }

    const approvalRequired = listing.nda_approval_required ?? true;
    const countersignRequired = listing.nda_countersign_required ?? true;
    const initialStatus = approvalRequired ? 'requested' : 'awaiting_buyer_signature';

    const { data, error } = await supabase
      .from('nda_requests')
      .insert({
        listing_id: listing.id,
        seller_org_id: listing.organization_id,
        buyer_org_id: buyerOrgId,
        status: initialStatus,
        source_nda_path: sourcePath,
        source_nda_file_name: sourceFileName || 'NDA.pdf',
        source_nda_sha256: sourceSha256 || '',
        signing_provider: 'internal_v1',
        requested_by_user_id: userId,
        request_note: note?.trim() || null,
        countersign_required: countersignRequired,
        approved_at: approvalRequired ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await appendAuditEvent({
      ndaRequestId: data.id,
      eventType: 'requested',
      actorUserId: userId,
      actorOrgId: buyerOrgId,
      actorEmail: userEmail,
      documentSha256: data.source_nda_sha256,
      metadata: { note: note?.trim() || null, instant: !approvalRequired },
    });

    if (!approvalRequired) {
      await appendAuditEvent({
        ndaRequestId: data.id,
        eventType: 'approved',
        actorUserId: userId,
        actorOrgId: buyerOrgId,
        actorEmail: userEmail,
        documentSha256: data.source_nda_sha256,
        metadata: { automatic_instant_nda: true },
      });
    }

    return data;
  },

  /**
   * Seller approves a pending NDA request, making the NDA available for the buyer to sign.
   */
  async approveNdaRequest({ ndaRequestId, userId, userOrgId, userEmail }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('nda_requests')
      .update({
        status: 'awaiting_buyer_signature',
        approved_by_user_id: userId,
        approved_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (error) throw error;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'approved',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      documentSha256: data.source_nda_sha256,
    });

    return data;
  },

  /**
   * Seller declines an NDA request (or rejects after redline/signature).
   */
  async declineNdaRequest({ ndaRequestId, userId, userOrgId, userEmail, reason = '' }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('nda_requests')
      .update({
        status: 'declined',
        declined_by_user_id: userId,
        declined_at: nowIso,
        decline_reason: reason?.trim() || null,
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (error) throw error;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'declined',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      metadata: { reason: reason?.trim() || null },
    });

    return data;
  },

  /**
   * Buyer withdraws an active NDA request prior to execution.
   */
  async withdrawNdaRequest({ ndaRequestId, userId, userOrgId, userEmail }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('nda_requests')
      .update({
        status: 'withdrawn',
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (error) throw error;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'withdrawn',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
    });

    return data;
  },

  /**
   * Seller manually grants or revokes CIM access after NDA execution.
   */
  async setCimAccess({ ndaRequestId, granted, userId, userOrgId, userEmail }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('nda_requests')
      .update({
        cim_access_granted: granted,
        cim_access_granted_at: granted ? nowIso : null,
        cim_access_granted_by: granted ? userId : null,
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (error) throw error;

    await appendAuditEvent({
      ndaRequestId,
      eventType: granted ? 'cim_granted' : 'cim_revoked',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      metadata: { manual: true },
    });

    return data;
  },

  /**
   * Uploads a redline / markup (.pdf or .docx) to the negotiation thread.
   */
  async uploadRedline({ ndaRequestId, file, role, userId, userOrgId, userEmail, comment = '' }) {
    if (!file) throw new Error('File is required');
    const sha256 = await computeFileSha256(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const { data: existing } = await supabase
      .from('nda_redlines')
      .select('version_number')
      .eq('nda_request_id', ndaRequestId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = ((existing && existing[0]?.version_number) || 0) + 1;
    const filePath = `requests/${ndaRequestId}/redlines/v${nextVersion}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('nda_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: redline, error: insertError } = await supabase
      .from('nda_redlines')
      .insert({
        nda_request_id: ndaRequestId,
        version_number: nextVersion,
        uploaded_by_user_id: userId,
        uploaded_by_org_id: userOrgId,
        uploaded_by_role: role,
        file_path: filePath,
        file_name: file.name,
        file_sha256: sha256,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { data: updatedReq, error: updateError } = await supabase
      .from('nda_requests')
      .update({
        status: 'in_redline',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (updateError) throw updateError;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'redline_uploaded',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      documentSha256: sha256,
      metadata: { version: nextVersion, role, file_name: file.name, comment: comment?.trim() || null },
    });

    return { redline, ndaRequest: updatedReq };
  },

  /**
   * Seller uploads a clean revised PDF after redline negotiation and sends it back for e-signing.
   */
  async sendRevisedNdaForEsign({ ndaRequestId, file, userId, userOrgId, userEmail, comment = '' }) {
    if (!file) throw new Error('Revised PDF file is required');
    const sha256 = await computeFileSha256(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `requests/${ndaRequestId}/revised_${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('nda_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const nowIso = new Date().toISOString();
    const { data: updatedReq, error: updateError } = await supabase
      .from('nda_requests')
      .update({
        status: 'awaiting_buyer_signature',
        source_nda_path: filePath,
        source_nda_file_name: file.name,
        source_nda_sha256: sha256,
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (updateError) throw updateError;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'revised_nda_sent',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      documentSha256: sha256,
      metadata: { file_name: file.name, comment: comment?.trim() || null },
    });

    return updatedReq;
  },

  /**
   * Seller uploads a fully executed offline/wet-signed NDA PDF, marking the request executed.
   */
  async uploadOfflineExecutedNda({
    ndaRequestId,
    file,
    userId,
    userOrgId,
    userEmail,
    comment = '',
    grantCim = true,
  }) {
    if (!file) throw new Error('Executed PDF file is required');
    const sha256 = await computeFileSha256(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `requests/${ndaRequestId}/offline_executed_${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('nda_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: existing } = await supabase
      .from('nda_redlines')
      .select('version_number')
      .eq('nda_request_id', ndaRequestId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = ((existing && existing[0]?.version_number) || 0) + 1;

    await supabase.from('nda_redlines').insert({
      nda_request_id: ndaRequestId,
      version_number: nextVersion,
      uploaded_by_user_id: userId,
      uploaded_by_org_id: userOrgId,
      uploaded_by_role: 'seller',
      file_path: filePath,
      file_name: file.name,
      file_sha256: sha256,
      comment: comment?.trim() || 'Fully executed offline NDA uploaded',
      is_final_executed: true,
    });

    const nowIso = new Date().toISOString();
    const { data: updatedReq, error: updateError } = await supabase
      .from('nda_requests')
      .update({
        status: 'executed',
        signing_provider: 'offline',
        executed_pdf_path: filePath,
        executed_pdf_sha256: sha256,
        executed_at: nowIso,
        cim_access_granted: Boolean(grantCim),
        cim_access_granted_at: grantCim ? nowIso : null,
        cim_access_granted_by: grantCim ? userId : null,
        updated_at: nowIso,
      })
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (updateError) throw updateError;

    await appendAuditEvent({
      ndaRequestId,
      eventType: 'offline_executed',
      actorUserId: userId,
      actorOrgId: userOrgId,
      actorEmail: userEmail,
      documentSha256: sha256,
      metadata: { file_name: file.name, cim_granted: Boolean(grantCim) },
    });

    return updatedReq;
  },

  async getRedlines(ndaRequestId) {
    const { data, error } = await supabase
      .from('nda_redlines')
      .select('*')
      .eq('nda_request_id', ndaRequestId)
      .order('version_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAuditEvents(ndaRequestId) {
    const { data, error } = await supabase
      .from('nda_audit_events')
      .select('*')
      .eq('nda_request_id', ndaRequestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
