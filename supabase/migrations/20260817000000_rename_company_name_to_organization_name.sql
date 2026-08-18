-- Rename company_name to organization_name in buyer_criteria table
ALTER TABLE public.buyer_criteria RENAME COLUMN company_name TO organization_name;
