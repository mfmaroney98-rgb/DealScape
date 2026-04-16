-- Migration to formalize relationship between user_profiles and organizations
-- 1. Ensure organizations table exists (if not created manually already)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name TEXT NOT NULL,
    website_url TEXT,
    organization_summary TEXT,
    type TEXT, -- e.g. 'Strategic', 'PE Shop', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add organization_id to user_profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user_profiles' AND COLUMN_NAME='organization_id') THEN
        ALTER TABLE user_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- 3. (Optional) Migrate existing names into the organizations table
-- This creates an organization for every unique name in user_profiles that hasn't been linked yet
INSERT INTO organizations (organization_name)
SELECT DISTINCT organization_name 
FROM user_profiles 
WHERE organization_name IS NOT NULL 
  AND organization_id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Link the profiles to the newly created organizations based on the name
UPDATE user_profiles up
SET organization_id = org.id
FROM organizations org
WHERE up.organization_name = org.organization_name
  AND up.organization_id IS NULL;

-- 5. Drop the redundant name column from profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS organization_name;

-- 6. Enable RLS on organizations if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 7. Policies for organizations
CREATE POLICY "Users can view organizations they belong to." 
ON organizations FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.organization_id = organizations.id 
    AND user_profiles.id = auth.uid()
));

CREATE POLICY "Users can update their own organization." 
ON organizations FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.organization_id = organizations.id 
    AND user_profiles.id = auth.uid()
));
