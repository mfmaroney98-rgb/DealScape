-- Drop the unused naics_codes_generated column from seller_listings
ALTER TABLE public.seller_listings DROP COLUMN IF EXISTS naics_codes_generated;
