-- Migration to add file storage columns to seller_listings table and establish storage bucket

-- 1. Add tracking columns for Teasers and CIMs if they don't exist
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS teaser_url text;
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS cim_url text;
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS teaser_file_name text;
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS cim_file_name text;

-- 2. Create the private storage bucket for listing documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing_documents', 'listing_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies on storage.objects for the new bucket
-- Drop policies if they already exist to prevent duplicate or conflicting rules
DROP POLICY IF EXISTS "Allow authenticated uploads to listing_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from listing_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to listing_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from listing_documents" ON storage.objects;

-- Create policies for storage.objects
CREATE POLICY "Allow authenticated uploads to listing_documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing_documents');

CREATE POLICY "Allow authenticated reads from listing_documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'listing_documents');

CREATE POLICY "Allow authenticated updates to listing_documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'listing_documents') WITH CHECK (bucket_id = 'listing_documents');

CREATE POLICY "Allow authenticated deletes from listing_documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'listing_documents');
