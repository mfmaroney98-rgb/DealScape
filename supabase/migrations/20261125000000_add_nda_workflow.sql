-- Migration: Add NDA Request, E-Signing, Redline/Offline, and CIM Gating Workflow

-- 1. Organization-level NDA workflow defaults
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_nda_approval_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_nda_countersign_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_auto_release_cim_on_nda boolean NOT NULL DEFAULT true;

-- 2. Organization NDA Templates Library
CREATE TABLE IF NOT EXISTS public.organization_nda_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_sha256 text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_nda_templates_single_default
  ON public.organization_nda_templates (organization_id)
  WHERE is_default = true AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_org_nda_templates_org
  ON public.organization_nda_templates (organization_id, is_archived);

-- 3. Listing-level NDA Configuration
ALTER TABLE public.seller_listings
  ADD COLUMN IF NOT EXISTS nda_template_id uuid REFERENCES public.organization_nda_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_nda_path text,
  ADD COLUMN IF NOT EXISTS custom_nda_file_name text,
  ADD COLUMN IF NOT EXISTS custom_nda_sha256 text,
  ADD COLUMN IF NOT EXISTS nda_approval_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nda_countersign_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_release_cim_on_nda boolean NOT NULL DEFAULT true;

-- 4. NDA Requests Table (one active request per listing + buyer org)
CREATE TABLE IF NOT EXISTS public.nda_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.seller_listings(id) ON DELETE CASCADE,
  seller_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  buyer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'requested',
    'awaiting_buyer_signature',
    'in_redline',
    'awaiting_seller_countersign',
    'executed',
    'declined',
    'withdrawn'
  )),
  source_nda_path text NOT NULL,
  source_nda_file_name text NOT NULL,
  source_nda_sha256 text NOT NULL,
  signing_provider text NOT NULL DEFAULT 'internal_v1' CHECK (signing_provider IN (
    'internal_v1',
    'dropbox_sign',
    'docusign',
    'offline'
  )),
  provider_envelope_id text,
  requested_by_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  request_note text,
  approved_by_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  declined_by_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  declined_at timestamptz,
  decline_reason text,
  buyer_signer_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  buyer_signer_name text,
  buyer_signer_title text,
  buyer_signer_email text,
  buyer_signed_at timestamptz,
  buyer_signature_data jsonb,
  countersign_required boolean NOT NULL DEFAULT true,
  seller_signer_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  seller_signer_name text,
  seller_signer_title text,
  seller_signer_email text,
  seller_signed_at timestamptz,
  seller_signature_data jsonb,
  executed_pdf_path text,
  executed_pdf_sha256 text,
  executed_at timestamptz,
  cim_access_granted boolean NOT NULL DEFAULT false,
  cim_access_granted_at timestamptz,
  cim_access_granted_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nda_requests_active_pair
  ON public.nda_requests (listing_id, buyer_org_id)
  WHERE status NOT IN ('declined', 'withdrawn');

CREATE INDEX IF NOT EXISTS idx_nda_requests_listing
  ON public.nda_requests (listing_id, status);

CREATE INDEX IF NOT EXISTS idx_nda_requests_buyer_org
  ON public.nda_requests (buyer_org_id, status);

CREATE INDEX IF NOT EXISTS idx_nda_requests_seller_org
  ON public.nda_requests (seller_org_id, status);

-- 5. NDA Redlines / Offline Negotiation Thread
CREATE TABLE IF NOT EXISTS public.nda_redlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_request_id uuid NOT NULL REFERENCES public.nda_requests(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  uploaded_by_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  uploaded_by_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  uploaded_by_role text NOT NULL CHECK (uploaded_by_role IN ('buyer', 'seller')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_sha256 text NOT NULL,
  comment text,
  is_final_executed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nda_redlines_request
  ON public.nda_redlines (nda_request_id, version_number);

-- 6. Immutable NDA Audit Events
CREATE TABLE IF NOT EXISTS public.nda_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_request_id uuid NOT NULL REFERENCES public.nda_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'requested',
    'approved',
    'declined',
    'withdrawn',
    'viewed',
    'redline_uploaded',
    'revised_nda_sent',
    'buyer_signed',
    'seller_countersigned',
    'offline_executed',
    'cim_granted',
    'cim_revoked'
  )),
  actor_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_email text,
  ip_address text,
  user_agent text,
  document_sha256 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nda_audit_events_request
  ON public.nda_audit_events (nda_request_id, created_at);

-- 7. Security Definer Helpers for RLS
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_corporate_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('corporate'::public.user_role, 'admin'::public.user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_nda_request(req_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.nda_requests nr
    WHERE nr.id = req_id
      AND (
        nr.buyer_org_id = public.current_user_org_id()
        OR nr.seller_org_id = public.current_user_org_id()
        OR public.is_corporate_or_admin()
      )
  );
$$;

-- 8. Enable RLS & Policies
ALTER TABLE public.organization_nda_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nda_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nda_redlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nda_audit_events ENABLE ROW LEVEL SECURITY;

-- organization_nda_templates policies
DROP POLICY IF EXISTS "Org members can view their NDA templates" ON public.organization_nda_templates;
CREATE POLICY "Org members can view their NDA templates"
  ON public.organization_nda_templates FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

DROP POLICY IF EXISTS "Org members can insert their NDA templates" ON public.organization_nda_templates;
CREATE POLICY "Org members can insert their NDA templates"
  ON public.organization_nda_templates FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

DROP POLICY IF EXISTS "Org members can update their NDA templates" ON public.organization_nda_templates;
CREATE POLICY "Org members can update their NDA templates"
  ON public.organization_nda_templates FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  )
  WITH CHECK (
    organization_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

DROP POLICY IF EXISTS "Org members can delete their NDA templates" ON public.organization_nda_templates;
CREATE POLICY "Org members can delete their NDA templates"
  ON public.organization_nda_templates FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

-- nda_requests policies
DROP POLICY IF EXISTS "Parties can view their NDA requests" ON public.nda_requests;
CREATE POLICY "Parties can view their NDA requests"
  ON public.nda_requests FOR SELECT TO authenticated
  USING (
    buyer_org_id = public.current_user_org_id()
    OR seller_org_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

DROP POLICY IF EXISTS "Buyers can create NDA requests for their org" ON public.nda_requests;
CREATE POLICY "Buyers can create NDA requests for their org"
  ON public.nda_requests FOR INSERT TO authenticated
  WITH CHECK (
    buyer_org_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

DROP POLICY IF EXISTS "Parties can update their NDA requests" ON public.nda_requests;
CREATE POLICY "Parties can update their NDA requests"
  ON public.nda_requests FOR UPDATE TO authenticated
  USING (
    buyer_org_id = public.current_user_org_id()
    OR seller_org_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  )
  WITH CHECK (
    buyer_org_id = public.current_user_org_id()
    OR seller_org_id = public.current_user_org_id()
    OR public.is_corporate_or_admin()
  );

-- nda_redlines policies
DROP POLICY IF EXISTS "Parties can view NDA redlines" ON public.nda_redlines;
CREATE POLICY "Parties can view NDA redlines"
  ON public.nda_redlines FOR SELECT TO authenticated
  USING (public.can_access_nda_request(nda_request_id));

DROP POLICY IF EXISTS "Parties can upload NDA redlines" ON public.nda_redlines;
CREATE POLICY "Parties can upload NDA redlines"
  ON public.nda_redlines FOR INSERT TO authenticated
  WITH CHECK (public.can_access_nda_request(nda_request_id));

-- nda_audit_events policies (append-only: SELECT + INSERT, no UPDATE/DELETE)
DROP POLICY IF EXISTS "Parties can view NDA audit events" ON public.nda_audit_events;
CREATE POLICY "Parties can view NDA audit events"
  ON public.nda_audit_events FOR SELECT TO authenticated
  USING (public.can_access_nda_request(nda_request_id));

DROP POLICY IF EXISTS "Parties can append NDA audit events" ON public.nda_audit_events;
CREATE POLICY "Parties can append NDA audit events"
  ON public.nda_audit_events FOR INSERT TO authenticated
  WITH CHECK (public.can_access_nda_request(nda_request_id));

-- 9. Private Storage Bucket for NDA Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('nda_documents', 'nda_documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads to nda_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from nda_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to nda_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from nda_documents" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to nda_documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nda_documents');

CREATE POLICY "Allow authenticated reads from nda_documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'nda_documents');

CREATE POLICY "Allow authenticated updates to nda_documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nda_documents') WITH CHECK (bucket_id = 'nda_documents');

CREATE POLICY "Allow authenticated deletes from nda_documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nda_documents');

-- 10. Tighten CIM Access on listing_documents Bucket
-- Teasers remain readable by all authenticated users; CIMs require seller org ownership, corporate/admin role, or granted CIM access via executed NDA.
CREATE OR REPLACE FUNCTION public.can_read_listing_document(object_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Non-CIM files (e.g., teasers) are readable by authenticated users
    object_path NOT LIKE '%/cim\_%' ESCAPE '\'
    OR public.is_corporate_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.seller_listings sl
      WHERE sl.cim_url = object_path
        AND sl.organization_id = public.current_user_org_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.seller_listings sl
      JOIN public.nda_requests nr ON nr.listing_id = sl.id
      WHERE sl.cim_url = object_path
        AND nr.buyer_org_id = public.current_user_org_id()
        AND nr.cim_access_granted = true
    );
$$;

DROP POLICY IF EXISTS "Allow authenticated reads from listing_documents" ON storage.objects;
CREATE POLICY "Allow authenticated reads from listing_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing_documents'
    AND public.can_read_listing_document(name)
  );
