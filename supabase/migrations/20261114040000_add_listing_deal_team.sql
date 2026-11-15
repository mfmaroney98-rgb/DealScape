-- Migration: Add primary_contact_ids and team_member_ids to seller_listings

ALTER TABLE public.seller_listings
  ADD COLUMN IF NOT EXISTS primary_contact_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS team_member_ids UUID[] DEFAULT '{}'::uuid[];
