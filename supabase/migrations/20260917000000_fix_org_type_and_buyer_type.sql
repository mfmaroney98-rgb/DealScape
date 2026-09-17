-- Migration: Fix organization 'type' vs 'buyer_type' conflict
-- 1. Ensure buyer_type column exists on organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS buyer_type TEXT;

-- 2. Data Migration: For organizations where type was set to a specific buyer classification
-- (e.g. 'PE Firm', 'Family Office', 'Search Fund', etc.), transfer it to buyer_type
-- if buyer_type is currently empty or NULL.
UPDATE public.organizations
SET buyer_type = type
WHERE type IS NOT NULL
  AND type NOT IN ('buyer', 'seller')
  AND (buyer_type IS NULL OR buyer_type = '');

-- 3. Reset type back to 'buyer' for any organization that had its role overwritten with a buyer classification
UPDATE public.organizations
SET type = 'buyer'
WHERE type IS NOT NULL
  AND type NOT IN ('buyer', 'seller');

-- 4. If any organizations still have a null type but have buyer_type set, ensure type is 'buyer'
UPDATE public.organizations
SET type = 'buyer'
WHERE (type IS NULL OR type = '')
  AND buyer_type IS NOT NULL
  AND buyer_type != '';
