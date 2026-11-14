-- Add 'Paused' to listing_status enum so sellers can temporarily hide listings from buyers
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'Paused';

