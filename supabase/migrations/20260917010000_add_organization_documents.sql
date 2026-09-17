-- Migration to add file storage columns to organizations table and establish organization_documents storage bucket

-- 1. Add tracking columns for firm overview document if they don't exist
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS overview_document_url text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS overview_file_name text;

-- 2. Create the storage bucket for organization documents if it doesn't exist (public bucket for overviews)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization_documents', 'organization_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies on storage.objects for the new bucket
DROP POLICY IF EXISTS "Allow public reads from organization_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to organization_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to organization_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from organization_documents" ON storage.objects;

-- Allow public read access to organization documents
CREATE POLICY "Allow public reads from organization_documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'organization_documents');

-- Allow authenticated users and service role to upload / update / delete
CREATE POLICY "Allow authenticated uploads to organization_documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'organization_documents');

CREATE POLICY "Allow authenticated updates to organization_documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'organization_documents') WITH CHECK (bucket_id = 'organization_documents');

CREATE POLICY "Allow authenticated deletes from organization_documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'organization_documents');
