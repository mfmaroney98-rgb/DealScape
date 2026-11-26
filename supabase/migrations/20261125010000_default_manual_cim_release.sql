-- Migration: Default automatic CIM release to false (manual release) for new organizations and listings

ALTER TABLE public.organizations
  ALTER COLUMN default_auto_release_cim_on_nda SET DEFAULT false;

ALTER TABLE public.seller_listings
  ALTER COLUMN auto_release_cim_on_nda SET DEFAULT false;
