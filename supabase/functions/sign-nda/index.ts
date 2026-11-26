import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      ndaRequestId,
      role,
      signerName,
      signerTitle,
      signatureText,
      esignConsent,
    } = body;

    if (!ndaRequestId || !['buyer', 'seller'].includes(role)) {
      return new Response(JSON.stringify({ error: 'ndaRequestId and valid role (buyer|seller) are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!esignConsent) {
      return new Response(JSON.stringify({ error: 'ESIGN electronic signature consent is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!signerName?.trim() || !signatureText?.trim()) {
      return new Response(JSON.stringify({ error: 'Signer full name and signature are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: profile }, { data: ndaReq, error: reqError }] = await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, organization_id, role, email, name, first_name, last_name, title')
        .eq('id', user.id)
        .single(),
      adminClient
        .from('nda_requests')
        .select('*')
        .eq('id', ndaRequestId)
        .single(),
    ]);

    if (reqError || !ndaReq) {
      return new Response(JSON.stringify({ error: 'NDA request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isCorporateOrAdmin = profile?.role === 'corporate' || profile?.role === 'admin';
    if (role === 'buyer') {
      if (!isCorporateOrAdmin && profile?.organization_id !== ndaReq.buyer_org_id) {
        return new Response(JSON.stringify({ error: 'Forbidden: not a member of the buyer organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (ndaReq.status !== 'awaiting_buyer_signature') {
        return new Response(JSON.stringify({ error: `Cannot sign in status: ${ndaReq.status}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!isCorporateOrAdmin && profile?.organization_id !== ndaReq.seller_org_id) {
        return new Response(JSON.stringify({ error: 'Forbidden: not a member of the seller organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (ndaReq.status !== 'awaiting_seller_countersign') {
        return new Response(JSON.stringify({ error: `Cannot countersign in status: ${ndaReq.status}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const [{ data: listing }, { data: buyerOrg }, { data: sellerOrg }] = await Promise.all([
      adminClient
        .from('seller_listings')
        .select('id, seller_anon_name, auto_release_cim_on_nda')
        .eq('id', ndaReq.listing_id)
        .single(),
      adminClient
        .from('organizations')
        .select('id, organization_name')
        .eq('id', ndaReq.buyer_org_id)
        .single(),
      adminClient
        .from('organizations')
        .select('id, organization_name')
        .eq('id', ndaReq.seller_org_id)
        .single(),
    ]);

    const nowIso = new Date().toISOString();
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const actorEmail = profile?.email || user.email || 'unknown';

    // Download source PDF and verify integrity
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('nda_documents')
      .download(ndaReq.source_nda_path);

    if (downloadError || !fileData) {
      throw downloadError || new Error('Failed to download source NDA PDF');
    }

    const sourceBytes = new Uint8Array(await fileData.arrayBuffer());
    const computedSourceSha = await sha256Hex(sourceBytes);

    // Build Certificate of Completion page using pdf-lib
    const pdfDoc = await PDFDocument.load(sourceBytes);
    const certPage = pdfDoc.addPage([612, 792]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const primary = rgb(0.18, 0.22, 0.45);
    const dark = rgb(0.1, 0.12, 0.18);
    const muted = rgb(0.38, 0.42, 0.5);
    const border = rgb(0.82, 0.85, 0.9);

    let y = 740;
    const drawText = (text: string, x: number, yPos: number, size = 10, font = fontRegular, color = dark) => {
      certPage.drawText(String(text || ''), { x, y: yPos, size, font, color });
    };

    drawText('DEALSCAPE — CERTIFICATE OF COMPLETION', 48, y, 15, fontBold, primary);
    y -= 18;
    drawText('Electronic Signature & ESIGN Audit Summary', 48, y, 10, fontRegular, muted);
    y -= 14;
    certPage.drawLine({ start: { x: 48, y }, end: { x: 564, y }, thickness: 1, color: border });
    y -= 22;

    drawText(`NDA Request ID: ${ndaReq.id}`, 48, y, 9, fontRegular, dark);
    y -= 14;
    drawText(`Listing Reference: ${listing?.seller_anon_name || ndaReq.listing_id}`, 48, y, 9, fontRegular, dark);
    y -= 14;
    drawText(`Source Document: ${ndaReq.source_nda_file_name}`, 48, y, 9, fontRegular, dark);
    y -= 14;
    drawText(`Source SHA-256: ${computedSourceSha}`, 48, y, 8, fontRegular, muted);
    y -= 24;

    // Buyer Block
    const buyerName = role === 'buyer' ? signerName.trim() : ndaReq.buyer_signer_name;
    const buyerTitle = role === 'buyer' ? (signerTitle?.trim() || 'Authorized Signatory') : (ndaReq.buyer_signer_title || 'Authorized Signatory');
    const buyerEmail = role === 'buyer' ? actorEmail : ndaReq.buyer_signer_email;
    const buyerSigText = role === 'buyer' ? signatureText.trim() : ndaReq.buyer_signature_data?.signatureText;
    const buyerSignedAt = role === 'buyer' ? nowIso : ndaReq.buyer_signed_at;
    const buyerIp = role === 'buyer' ? clientIp : (ndaReq.buyer_signature_data?.ip || 'recorded');

    certPage.drawRectangle({ x: 48, y: y - 118, width: 516, height: 124, borderColor: border, borderWidth: 1 });
    drawText('BUYER EXECUTION', 60, y - 14, 10, fontBold, primary);
    drawText(`Organization: ${buyerOrg?.organization_name || ndaReq.buyer_org_id}`, 60, y - 32, 9, fontRegular, dark);
    drawText(`Signer: ${buyerName} (${buyerTitle})`, 60, y - 47, 9, fontRegular, dark);
    drawText(`Email: ${buyerEmail}`, 60, y - 62, 9, fontRegular, dark);
    drawText(`Signature: /s/ ${buyerSigText}`, 60, y - 80, 11, fontItalic, dark);
    drawText(`Signed UTC: ${buyerSignedAt}   |   IP: ${buyerIp}`, 60, y - 98, 8, fontRegular, muted);
    drawText('ESIGN Act Electronic Consent Confirmed: Yes', 60, y - 111, 8, fontRegular, muted);

    y -= 144;

    // Seller Block
    if (ndaReq.countersign_required) {
      certPage.drawRectangle({ x: 48, y: y - 118, width: 516, height: 124, borderColor: border, borderWidth: 1 });
      drawText('SELLER COUNTERSIGNATURE', 60, y - 14, 10, fontBold, primary);
      drawText(`Organization: ${sellerOrg?.organization_name || ndaReq.seller_org_id}`, 60, y - 32, 9, fontRegular, dark);
      if (role === 'seller') {
        drawText(`Signer: ${signerName.trim()} (${signerTitle?.trim() || 'Authorized Signatory'})`, 60, y - 47, 9, fontRegular, dark);
        drawText(`Email: ${actorEmail}`, 60, y - 62, 9, fontRegular, dark);
        drawText(`Signature: /s/ ${signatureText.trim()}`, 60, y - 80, 11, fontItalic, dark);
        drawText(`Signed UTC: ${nowIso}   |   IP: ${clientIp}`, 60, y - 98, 8, fontRegular, muted);
        drawText('ESIGN Act Electronic Consent Confirmed: Yes', 60, y - 111, 8, fontRegular, muted);
      } else {
        drawText('Status: Pending Seller Countersignature', 60, y - 54, 9, fontItalic, muted);
      }
      y -= 144;
    } else {
      drawText('Seller Countersignature: Not required per listing configuration', 48, y - 10, 9, fontItalic, muted);
      y -= 32;
    }

    drawText(
      'This document was electronically executed via DealScape. Tampering with the PDF invalidates the SHA-256 digest.',
      48,
      64,
      8,
      fontRegular,
      muted
    );

    const outBytes = await pdfDoc.save();
    const outSha256 = await sha256Hex(outBytes);
    const outPath = `requests/${ndaRequestId}/executed_${role === 'seller' ? 'final' : 'buyer'}.pdf`;

    const { error: uploadError } = await adminClient.storage
      .from('nda_documents')
      .upload(outPath, outBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const isFullyExecuted = role === 'seller' || !ndaReq.countersign_required;
    const shouldGrantCim = isFullyExecuted && Boolean(listing?.auto_release_cim_on_nda);

    const updatePayload: Record<string, unknown> = {
      signing_provider: 'internal_v1',
      executed_pdf_path: outPath,
      executed_pdf_sha256: outSha256,
      updated_at: nowIso,
    };

    if (role === 'buyer') {
      updatePayload.buyer_signer_user_id = user.id;
      updatePayload.buyer_signer_name = signerName.trim();
      updatePayload.buyer_signer_title = signerTitle?.trim() || null;
      updatePayload.buyer_signer_email = actorEmail;
      updatePayload.buyer_signed_at = nowIso;
      updatePayload.buyer_signature_data = {
        signatureText: signatureText.trim(),
        esignConsent: true,
        ip: clientIp,
        userAgent,
      };
      updatePayload.status = ndaReq.countersign_required
        ? 'awaiting_seller_countersign'
        : 'executed';
    } else {
      updatePayload.seller_signer_user_id = user.id;
      updatePayload.seller_signer_name = signerName.trim();
      updatePayload.seller_signer_title = signerTitle?.trim() || null;
      updatePayload.seller_signer_email = actorEmail;
      updatePayload.seller_signed_at = nowIso;
      updatePayload.seller_signature_data = {
        signatureText: signatureText.trim(),
        esignConsent: true,
        ip: clientIp,
        userAgent,
      };
      updatePayload.status = 'executed';
    }

    if (isFullyExecuted) {
      updatePayload.executed_at = nowIso;
      if (shouldGrantCim) {
        updatePayload.cim_access_granted = true;
        updatePayload.cim_access_granted_at = nowIso;
        updatePayload.cim_access_granted_by = user.id;
      }
    }

    const { data: updatedReq, error: updateError } = await adminClient
      .from('nda_requests')
      .update(updatePayload)
      .eq('id', ndaRequestId)
      .select()
      .single();

    if (updateError) throw updateError;

    const auditRows: Record<string, unknown>[] = [
      {
        nda_request_id: ndaRequestId,
        event_type: role === 'buyer' ? 'buyer_signed' : 'seller_countersigned',
        actor_user_id: user.id,
        actor_org_id: profile?.organization_id || null,
        actor_email: actorEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        document_sha256: outSha256,
        metadata: {
          signer_name: signerName.trim(),
          signer_title: signerTitle?.trim() || null,
          source_sha256: computedSourceSha,
        },
      },
    ];

    if (shouldGrantCim) {
      auditRows.push({
        nda_request_id: ndaRequestId,
        event_type: 'cim_granted',
        actor_user_id: user.id,
        actor_org_id: profile?.organization_id || null,
        actor_email: actorEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        document_sha256: outSha256,
        metadata: { automatic: true },
      });
    }

    await adminClient.from('nda_audit_events').insert(auditRows);

    return new Response(JSON.stringify({ ndaRequest: updatedReq }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sign-nda error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
