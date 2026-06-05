-- Add AUM, Year Founded, and Funds list to organizations for buyer profiles
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS aum numeric,
ADD COLUMN IF NOT EXISTS year_founded integer,
ADD COLUMN IF NOT EXISTS funds jsonb DEFAULT '[]'::jsonb;
