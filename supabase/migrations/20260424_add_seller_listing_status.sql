-- Create ENUM type for listing status
CREATE TYPE listing_status AS ENUM (
    'Draft',
    'Active',
    'Under Offer',
    'Closed',
    'Withdrawn'
);

-- Add status column to seller_listings table with default value 'Draft'
ALTER TABLE seller_listings 
ADD COLUMN status listing_status DEFAULT 'Draft';

-- Drop the old policies that allowed buyers to view all listings
DROP POLICY IF EXISTS "Buyers can view sellers." ON seller_listings;
DROP POLICY IF EXISTS "Buyers can view seller_listings." ON seller_listings;

-- Create the new policy that only allows buyers to view active listings
CREATE POLICY "Buyers can view active seller_listings." 
ON seller_listings 
FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'buyer')
    AND status = 'Active'
);
