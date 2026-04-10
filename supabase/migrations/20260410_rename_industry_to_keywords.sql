-- Rename industry columns to keywords
ALTER TABLE sellers RENAME COLUMN industry_codes TO keywords;
ALTER TABLE buyer_criteria RENAME COLUMN industries TO keywords;

-- Standardize seller location to mirror buyer_criteria TEXT[] arrays
ALTER TABLE sellers DROP COLUMN location_city;
ALTER TABLE sellers DROP COLUMN location_state;
ALTER TABLE sellers DROP COLUMN location_country;
ALTER TABLE sellers ADD COLUMN locations TEXT[] DEFAULT '{}';
