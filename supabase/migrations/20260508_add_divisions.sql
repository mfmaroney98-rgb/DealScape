-- Migration to add divisions for buyer organizations

CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view divisions in their organization"
ON divisions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.organization_id = divisions.organization_id
    AND user_profiles.id = auth.uid()
));

CREATE POLICY "Users can manage divisions in their organization"
ON divisions FOR ALL
USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.organization_id = divisions.organization_id
    AND user_profiles.id = auth.uid()
));

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='buyer_criteria' AND COLUMN_NAME='division_id') THEN
        ALTER TABLE buyer_criteria ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
    END IF;
END $$;
