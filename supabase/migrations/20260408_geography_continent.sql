-- ============================================================
-- Add continent column to global_countries
-- ============================================================
ALTER TABLE global_countries ADD COLUMN IF NOT EXISTS continent VARCHAR;

-- ============================================================
-- Africa
-- ============================================================
UPDATE global_countries SET continent = 'Africa' WHERE code IN (
  'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM',
  'CV', 'DJ', 'DZ', 'EG', 'EH', 'ER', 'ET', 'GA', 'GH', 'GM',
  'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG',
  'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW',
  'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG',
  'TN', 'TZ', 'UG', 'YT', 'ZA', 'ZM', 'ZW'
);

-- ============================================================
-- Antarctica
-- ============================================================
UPDATE global_countries SET continent = 'Antarctica' WHERE code IN (
  'AQ', 'BV', 'GS', 'HM', 'TF'
);

-- ============================================================
-- Asia
-- ============================================================
UPDATE global_countries SET continent = 'Asia' WHERE code IN (
  'AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'BN', 'BT', 'CN', 'GE',
  'HK', 'ID', 'IL', 'IN', 'IQ', 'IR', 'IO', 'JO', 'JP', 'KG',
  'KH', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LK', 'MM', 'MN',
  'MO', 'MV', 'MY', 'NP', 'OM', 'PH', 'PK', 'PS', 'QA', 'SA',
  'SG', 'SY', 'TH', 'TJ', 'TL', 'TM', 'TW', 'UZ', 'VN', 'YE'
);

-- ============================================================
-- Europe
-- ============================================================
UPDATE global_countries SET continent = 'Europe' WHERE code IN (
  'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY',
  'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GG',
  'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI',
  'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO',
  'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'SJ',
  'TR', 'UA', 'VA', 'XK'
);

-- ============================================================
-- North America
-- ============================================================
UPDATE global_countries SET continent = 'North America' WHERE code IN (
  'AG', 'AI', 'AW', 'BB', 'BL', 'BM', 'BS', 'BZ', 'CA', 'CR',
  'CU', 'CW', 'DM', 'DO', 'GD', 'GL', 'GP', 'GT', 'HN', 'HT',
  'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'MX', 'NI', 'PA',
  'PM', 'PR', 'SV', 'SX', 'TC', 'TT', 'US', 'VC', 'VG', 'VI'
);

-- ============================================================
-- Oceania
-- ============================================================
UPDATE global_countries SET continent = 'Oceania' WHERE code IN (
  'AS', 'AU', 'CC', 'CK', 'CX', 'FJ', 'FM', 'GU', 'KI', 'MH',
  'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF', 'PG', 'PN', 'PW',
  'SB', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'
);

-- ============================================================
-- South America
-- ============================================================
UPDATE global_countries SET continent = 'South America' WHERE code IN (
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE',
  'PY', 'SR', 'UY', 'VE'
);

-- Verify: check any countries that didn't get assigned a continent
-- SELECT code, name FROM global_countries WHERE continent IS NULL ORDER BY name;
