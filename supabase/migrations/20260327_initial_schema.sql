-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE transaction_type AS ENUM (
    'Total Sale', 
    'Acquisition of Majority Stake', 
    'Debt Raise', 
    'Minority Equity Raise', 
    'Mezzanine Financing', 
    'Divestiture / Carve-out'
);

-- Profiles (Linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    role user_role DEFAULT 'seller',
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sellers / Deals
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Anonymized Display
    title TEXT NOT NULL, -- e.g. "Leading Material Handling Equipment Manufacturers"
    project_name TEXT,
    
    -- Company Info
    location_city TEXT,
    location_state TEXT,
    location_country TEXT DEFAULT 'USA',
    employees_count INTEGER,
    industry_codes TEXT[], -- NAICS or internal industry tags
    company_type TEXT,
    company_ownership TEXT,
    
    -- Flags
    is_founder_owned BOOLEAN DEFAULT false,
    is_female_owned BOOLEAN DEFAULT false,
    is_minority_owned BOOLEAN DEFAULT false,
    is_family_owned BOOLEAN DEFAULT false,
    
    -- Transaction
    pref_transaction_type transaction_type,
    
    -- Latest Financials (for quick searching)
    revenue NUMERIC(15,2),
    ebitda NUMERIC(15,2),
    gross_profit NUMERIC(15,2),
    net_income NUMERIC(15,2),
    growth_rate_pct NUMERIC(5,2),
    
    -- Full Financial History (JSONB for flexibility)
    financial_history JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buyer Search Criteria
CREATE TABLE buyer_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Preferred Ranges
    min_revenue NUMERIC(15,2),
    max_revenue NUMERIC(15,2),
    min_ebitda NUMERIC(15,2),
    max_ebitda NUMERIC(15,2),
    min_employees INTEGER,
    max_employees INTEGER,
    
    -- Preferred Attributes
    locations TEXT[], -- ["Midwest", "Ohio", etc.]
    industries TEXT[],
    transaction_types transaction_type[],
    
    -- Required Metadata
    require_founder_owned BOOLEAN,
    require_female_owned BOOLEAN,
    require_minority_owned BOOLEAN,
    require_family_owned BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_criteria ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sellers can manage their own listings." ON sellers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Buyers can view sellers." ON sellers FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'buyer'));

CREATE POLICY "Buyers can manage their own criteria." ON buyer_criteria FOR ALL USING (auth.uid() = user_id);
