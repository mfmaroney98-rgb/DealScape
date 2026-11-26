import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { listingId, documentType } = await req.json();
    if (!listingId || !['teaser', 'cim'].includes(documentType)) {
      return new Response(JSON.stringify({ error: 'listingId and valid documentType (teaser|cim) are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: profile }, { data: listing, error: listingError }] = await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .single(),
      adminClient
        .from('seller_listings')
        .select('id, organization_id, teaser_url, teaser_file_name, cim_url, cim_file_name')
        .eq('id', listingId)
        .single(),
    ]);

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filePath = documentType === 'teaser' ? listing.teaser_url : listing.cim_url;
    const fileName = documentType === 'teaser' ? listing.teaser_file_name : listing.cim_file_name;

    if (!filePath) {
      return new Response(JSON.stringify({ error: `No ${documentType} uploaded for this listing` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (documentType === 'cim') {
      const isSellerOwner = profile?.organization_id && profile.organization_id === listing.organization_id;
      const isCorporateOrAdmin = profile?.role === 'corporate' || profile?.role === 'admin';

      if (!isSellerOwner && !isCorporateOrAdmin) {
        if (!profile?.organization_id) {
          return new Response(JSON.stringify({ error: 'CIM access requires an executed NDA and seller approval' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: ndaRequest } = await adminClient
          .from('nda_requests')
          .select('id, status, cim_access_granted')
          .eq('listing_id', listingId)
          .eq('buyer_org_id', profile.organization_id)
          .eq('cim_access_granted', true)
          .maybeSingle();

        if (!ndaRequest) {
          return new Response(JSON.stringify({ error: 'CIM access requires an executed NDA and granted access' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const { data: signed, error: signError } = await adminClient.storage
      .from('listing_documents')
      .createSignedUrl(filePath, 120);

    if (signError || !signed?.signedUrl) {
      throw signError || new Error('Failed to create signed URL');
    }

    return new Response(
      JSON.stringify({ signedUrl: signed.signedUrl, fileName: fileName || `${documentType}.pdf` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-listing-document-url error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
