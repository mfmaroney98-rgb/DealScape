-- WARNING: This schema is for context only and is not meant to be run.
-- This file represents the LIVE state of the database as of May 9, 2026.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Test_table (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Test_table_pkey PRIMARY KEY (id)
);

CREATE TABLE public.buyer_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  locations ARRAY, -- TEXT[]
  keywords ARRAY, -- TEXT[]
  pref_transaction_type ARRAY, -- TEXT[]
  require_founder_owned boolean,
  require_female_owned boolean,
  require_minority_owned boolean,
  require_family_owned boolean,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  investment_criteria_name text,
  require_operator_owned boolean,
  company_name text,
  naics_codes ARRAY DEFAULT '{}'::text[],
  financial_criteria jsonb DEFAULT '[]'::jsonb,
  organization_id uuid,
  search_revenue_min numeric,
  search_revenue_max numeric,
  search_revenue_growth_yoy_min numeric,
  search_revenue_growth_yoy_max numeric,
  search_revenue_cagr_min numeric,
  search_revenue_cagr_max numeric,
  search_gross_profit_min numeric,
  search_gross_profit_max numeric,
  search_gross_margin_min numeric,
  search_gross_margin_max numeric,
  search_ebitda_min numeric,
  search_ebitda_max numeric,
  search_ebitda_growth_yoy_min numeric,
  search_ebitda_growth_yoy_max numeric,
  search_ebitda_margin_min numeric,
  search_ebitda_margin_max numeric,
  search_ebit_min numeric,
  search_ebit_max numeric,
  search_ebit_margin_min numeric,
  search_ebit_margin_max numeric,
  search_net_income_min numeric,
  search_net_income_max numeric,
  search_net_margin_min numeric,
  search_net_margin_max numeric,
  categorized_keywords jsonb DEFAULT '{}'::jsonb,
  last_embedded_text text,
  division text,
  embedding USER-DEFINED, -- vector
  CONSTRAINT buyer_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_criteria_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT buyer_criteria_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE public.financial_metrics (
  id integer NOT NULL DEFAULT nextval('financial_metrics_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  sort_order integer NOT NULL,
  CONSTRAINT financial_metrics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.global_countries (
  code character varying NOT NULL,
  name character varying NOT NULL,
  continent character varying,
  CONSTRAINT global_countries_pkey PRIMARY KEY (code)
);

CREATE TABLE public.global_states (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  country_code character varying,
  CONSTRAINT global_states_pkey PRIMARY KEY (id),
  CONSTRAINT global_states_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.global_countries(code)
);

CREATE TABLE public.naics_sectors (
  code character varying NOT NULL,
  name character varying NOT NULL,
  CONSTRAINT naics_sectors_pkey PRIMARY KEY (code)
);

CREATE TABLE public.naics_subsectors (
  code character varying NOT NULL,
  name character varying NOT NULL,
  sector_code character varying,
  CONSTRAINT naics_subsectors_pkey PRIMARY KEY (code),
  CONSTRAINT naics_subsectors_sector_code_fkey FOREIGN KEY (sector_code) REFERENCES public.naics_sectors(code)
);

CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  type text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  website_url text,
  organization_summary text,
  buyer_type text,
  divisions ARRAY DEFAULT '{}'::text[],
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.seller_listings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  seller_name text NOT NULL,
  seller_anon_name text,
  employees_count integer,
  legal_entity text,
  ownership_structure text,
  is_founder_owned boolean DEFAULT false,
  is_female_owned boolean DEFAULT false,
  is_minority_owned boolean DEFAULT false,
  is_family_owned boolean DEFAULT false,
  financial_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_operator_owned boolean,
  keywords text,
  locations ARRAY DEFAULT '{}'::text[],
  year_founded smallint,
  pref_transaction_type ARRAY,
  organization_id uuid,
  
  -- GENERATED SEARCH COLUMNS (Live definitions)
  search_gross_profit numeric DEFAULT COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'gross_profit'::text), ''::text))::numeric, (NULLIF(((financial_history -> '2025'::text) ->> 'gross_profit'::text), ''::text))::numeric),
  search_ebit numeric DEFAULT COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'ebit'::text), ''::text))::numeric, (NULLIF(((financial_history -> '2025'::text) ->> 'ebit'::text), ''::text))::numeric),
  search_net_income numeric DEFAULT COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'net_income'::text), ''::text))::numeric, (NULLIF(((financial_history -> '2025'::text) ->> 'net_income'::text), ''::text))::numeric),
  search_ebitda_growth_yoy numeric DEFAULT 
    CASE
        WHEN (((NULLIF(((financial_history -> '2024'::text) ->> 'ebitda'::text), ''::text))::numeric IS NOT NULL) AND ((NULLIF(((financial_history -> '2024'::text) ->> 'ebitda'::text), ''::text))::numeric <> (0)::numeric) AND ((NULLIF(((financial_history -> '2025'::text) ->> 'ebitda'::text), ''::text))::numeric IS NOT NULL)) THEN (((NULLIF(((financial_history -> '2025'::text) ->> 'ebitda'::text), ''::text))::numeric - (NULLIF(((financial_history -> '2024'::text) ->> 'ebitda'::text), ''::text))::numeric) / (NULLIF(((financial_history -> '2024'::text) ->> 'ebitda'::text), ''::text))::numeric)
        ELSE NULL::numeric
    END,
  search_revenue numeric DEFAULT COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric),
  search_ebitda numeric DEFAULT COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'ebitda'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'ebitda'::text), ''::text))::numeric),
  search_ebitda_margin numeric DEFAULT 
    CASE
        WHEN (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric, (0)::numeric) = (0)::numeric) THEN NULL::numeric
        ELSE (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'ebitda'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'ebitda'::text), ''::text))::numeric) / NULLIF(COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric), (0)::numeric))
    END,
  search_gross_margin numeric DEFAULT 
    CASE
        WHEN (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric, (0)::numeric) = (0)::numeric) THEN NULL::numeric
        ELSE (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'gross_profit'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'gross_profit'::text), ''::text))::numeric) / NULLIF(COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric), (0)::numeric))
    END,
  search_ebit_margin numeric DEFAULT 
    CASE
        WHEN (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric, (0)::numeric) = (0)::numeric) THEN NULL::numeric
        ELSE (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'ebit'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'ebit'::text), ''::text))::numeric) / NULLIF(COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric), (0)::numeric))
    END,
  search_net_margin numeric DEFAULT 
    CASE
        WHEN (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric, (0)::numeric) = (0)::numeric) THEN NULL::numeric
        ELSE (COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'net_income'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'net_income'::text), ''::text))::numeric) / NULLIF(COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric), (0)::numeric))
    END,
  search_revenue_growth_yoy numeric DEFAULT 
    CASE
        WHEN (((NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric IS NOT NULL) AND ((NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric <> (0)::numeric) AND ((NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric IS NOT NULL)) THEN (((NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric - (NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric) / (NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric)
        ELSE NULL::numeric
    END,
  search_revenue_cagr numeric DEFAULT 
    CASE
        WHEN ((calculate_revenue_years(financial_history) > 0.5) AND (COALESCE((NULLIF(((financial_history -> 'FY-2'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric, (0)::numeric) > (0)::numeric)) THEN (power((COALESCE((NULLIF(((financial_history -> 'LTM'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY0'::text) ->> 'revenue'::text), ''::text))::numeric) / COALESCE((NULLIF(((financial_history -> 'FY-2'::text) ->> 'revenue'::text), ''::text))::numeric, (NULLIF(((financial_history -> 'FY-1'::text) ->> 'revenue'::text), ''::text))::numeric)), (1.0 / NULLIF(calculate_revenue_years(financial_history), (0)::numeric))) - (1)::numeric)
        ELSE NULL::numeric
    END,
    
  embedding USER-DEFINED, -- vector
  summary text,
  status USER-DEFINED DEFAULT 'Draft'::listing_status,
  categorized_keywords jsonb DEFAULT '{}'::jsonb,
  last_embedded_text text,
  CONSTRAINT seller_listings_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT sellers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  name text,
  role USER-DEFINED DEFAULT 'seller'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  organization_id uuid,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
