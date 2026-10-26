import { supabase } from '../lib/supabase';

/**
 * Fetches all NAICS sectors with their subsectors from Supabase.
 * Returns an array shaped like:
 * [
 *   { code: '11', name: 'Agriculture...', subsectors: [{ code: '111', name: 'Crop Production' }, ...] },
 *   ...
 * ]
 */
export async function fetchNaicsSectors() {
  // 1. Fetch sectors (2-digit)
  const { data: sectors, error: sectorsError } = await supabase
    .from('naics_sectors')
    .select('code, name')
    .order('code');

  if (sectorsError) throw sectorsError;

  // 2. Fetch all subsectors (3-digit)
  const { data: subsectors, error: subsectorsError } = await supabase
    .from('naics_subsectors')
    .select('code, name, sector_code')
    .order('code');

  if (subsectorsError) throw subsectorsError;

  // 3. Fetch all industry groups (4-digit)
  const { data: industryGroups, error: industryGroupsError } = await supabase
    .from('naics_industry_groups')
    .select('code, name, subsector_code')
    .order('code');

  // If the table doesn't exist yet or errors, we'll fall back to empty array
  const safeIndustryGroups = industryGroups || [];

  // Join everything into a tree
  return sectors.map(sector => ({
    code: sector.code,
    name: sector.name,
    subsectors: subsectors
      .filter(sub => sub.sector_code === sector.code)
      .map(sub => ({
        code: sub.code,
        name: sub.name,
        industryGroups: safeIndustryGroups
          .filter(ig => ig.subsector_code === sub.code)
          .map(ig => ({ code: ig.code, name: ig.name }))
      }))
  }));
}

/**
 * Complete map of deprecated/reclassified 2017 NAICS codes to official 2022 NAICS codes.
 */
export const NAICS_2017_TO_2022_MAP = {
  // 4-digit Industry Groups
  '5112': '5132', // Software Publishers
  '5111': '5131', // Newspaper, Periodical, Book, and Directory Publishers
  '5151': '5161', // Radio and Television Broadcasting
  '5191': '5192', // Other Information Services
  '4481': '4581', // Clothing Stores -> Clothing & Accessories Retailers
  '4482': '4582', // Shoe Stores
  '4483': '4583', // Jewelry, Luggage, and Leather Goods
  '4421': '4491', // Furniture Stores
  '4422': '4491', // Home Furnishings Stores
  '4431': '4492', // Electronics and Appliance Stores
  '4511': '4591', // Sporting Goods, Hobby, and Musical Instrument
  '4512': '4592', // Book Stores and News Dealers
  '4531': '4593', // Florists
  '4532': '4594', // Office Supplies, Stationery, and Gift
  '4533': '4595', // Used Merchandise Stores
  '4539': '4599', // Other Miscellaneous Store Retailers
  '4541': '4599', // Electronic Shopping and Mail-Order Houses
  '5172': '5171', // Wireless Telecom
  '5173': '5171', // Wired/Wireless Telecom
  '5179': '5171', // Other Telecom
  '5319': '5313', // Hallucinated -> Real Estate Services

  // 3-digit Subsectors
  '511': '513',  // Publishing Industries
  '515': '516',  // Broadcasting (except Internet)
  '442': '449',  // Furniture and Home Furnishings Stores
  '443': '449',  // Electronics and Appliance Stores
  '448': '458',  // Clothing and Clothing Accessories Stores
  '451': '459',  // Sporting Goods, Hobby, Musical Instrument, and Book
  '452': '455',  // General Merchandise Stores
  '453': '459',  // Miscellaneous Store Retailers
  '454': '459'   // Nonstore Retailers
};

/**
 * Resolves any 2, 3, or 4-digit code to its 2-digit sector code in the database.
 * Correctly accounts for multi-code range sectors:
 * 31, 32, 33 -> '31-33' (Manufacturing)
 * 44, 45     -> '44-45' (Retail Trade)
 * 48, 49     -> '48-49' (Transportation & Warehousing)
 */
export function getSectorCodeForNaics(code) {
  if (!code) return '';
  const c = String(code).trim();
  if (c.length < 2) return '';
  const p2 = c.substring(0, 2);
  const n = Number(p2);
  if (n >= 31 && n <= 33) return '31-33';
  if (n >= 44 && n <= 45) return '44-45';
  if (n >= 48 && n <= 49) return '48-49';
  return p2;
}

/**
 * Checks if a given NAICS code exists in the official 2022 sectorsTree.
 */
export function isValidNaicsCode(code, sectorsTree) {
  if (!code || !sectorsTree || !sectorsTree.length) return false;
  const c = String(code).trim();

  // 1. Sector level
  if (sectorsTree.some(s => s.code === c)) return true;

  // 2. Subsector or Industry Group level
  for (const s of sectorsTree) {
    if (s.subsectors?.some(sub => sub.code === c)) return true;
    for (const sub of s.subsectors || []) {
      if (sub.industryGroups?.some(ig => ig.code === c)) return true;
    }
  }
  return false;
}

/**
 * Normalizes an array of NAICS codes to guarantee strict alignment with 2022 NAICS:
 * 1. Automatically translates legacy 2017 codes (e.g. 5112 -> 5132, 4481 -> 4581)
 * 2. Normalizes sector span prefixes (31/32/33 -> 31-33, 44/45 -> 44-45, 48/49 -> 48-49)
 * 3. Filters out any unrecognized, hallucinated, or malformed codes if sectorsTree is provided
 * 4. Deduplicates results while preserving sequence
 */
export function normalizeTo2022Naics(codes, sectorsTree) {
  if (!codes || !Array.isArray(codes)) return [];

  const normalized = [];
  for (const raw of codes) {
    let code = String(raw).trim();
    if (!code) continue;

    // Check direct 2017 -> 2022 code translation
    if (NAICS_2017_TO_2022_MAP[code]) {
      code = NAICS_2017_TO_2022_MAP[code];
    }

    // Normalize sector ranges
    if (['31', '32', '33'].includes(code)) code = '31-33';
    else if (['44', '45'].includes(code)) code = '44-45';
    else if (['48', '49'].includes(code)) code = '48-49';

    // If sectorsTree is provided, validate against loaded database records
    if (sectorsTree && sectorsTree.length > 0) {
      let valid = isValidNaicsCode(code, sectorsTree);
      if (!valid && code.length === 4) {
        // Try parent 3-digit fallback translation (e.g. 448x -> 458x)
        const p3 = code.slice(0, 3);
        if (NAICS_2017_TO_2022_MAP[p3]) {
          const candidate = NAICS_2017_TO_2022_MAP[p3] + code.slice(3);
          if (isValidNaicsCode(candidate, sectorsTree)) {
            code = candidate;
            valid = true;
          }
        }
      }
      if (valid) {
        normalized.push(code);
      }
    } else {
      normalized.push(code);
    }
  }

  return [...new Set(normalized)];
}

/**
 * Recursively expands a list of 2, 3, or 4-digit NAICS codes
 * by adding all their corresponding child codes from the sectorsTree.
 * This ensures that broad AI-selected codes automatically check all children.
 */
export function expandNaicsCodes(codes, sectorsTree) {
  if (!codes || !Array.isArray(codes) || !sectorsTree || !sectorsTree.length) {
    return codes || [];
  }

  const expanded = new Set(codes);

  codes.forEach(code => {
    let cleanCode = String(code).trim();
    if (['31', '32', '33'].includes(cleanCode)) cleanCode = '31-33';
    else if (['44', '45'].includes(cleanCode)) cleanCode = '44-45';
    else if (['48', '49'].includes(cleanCode)) cleanCode = '48-49';

    if (cleanCode.length === 2 || cleanCode.includes('-')) {
      // It's a Sector: find it and add all its subsectors & industry groups
      const sector = sectorsTree.find(s => s.code === cleanCode);
      if (sector) {
        sector.subsectors.forEach(sub => {
          expanded.add(sub.code);
          if (sub.industryGroups) {
            sub.industryGroups.forEach(ig => expanded.add(ig.code));
          }
        });
      }
    } else if (cleanCode.length === 3) {
      // It's a Subsector: find it across all sectors
      for (const sector of sectorsTree) {
        const sub = sector.subsectors.find(s => s.code === cleanCode);
        if (sub) {
          if (sub.industryGroups) {
            sub.industryGroups.forEach(ig => expanded.add(ig.code));
          }
          break; // Found, can stop searching
        }
      }
    }
  });

  return Array.from(expanded);
}

let naicsMapPromise = null;

/**
 * Fetches all NAICS codes and names directly from the database tables
 * (naics_sectors, naics_subsectors, naics_industry_groups)
 * and returns a Map for fast, direct code-to-name lookup.
 */
export async function fetchNaicsMap() {
  if (naicsMapPromise) return naicsMapPromise;

  naicsMapPromise = (async () => {
    const [secRes, subRes, grpRes] = await Promise.all([
      supabase.from('naics_sectors').select('code, name'),
      supabase.from('naics_subsectors').select('code, name'),
      supabase.from('naics_industry_groups').select('code, name')
    ]);

    if (secRes.error) throw secRes.error;
    if (subRes.error) throw subRes.error;

    const map = new Map();

    // 1. Industry groups (4-digit)
    for (const g of grpRes.data || []) {
      if (g.code && g.name) map.set(String(g.code).trim(), g.name);
    }

    // 2. Subsectors (3-digit)
    for (const s of subRes.data || []) {
      if (s.code && s.name) map.set(String(s.code).trim(), s.name);
    }

    // 3. Sectors (2-digit and ranges like '31-33', '44-45', '48-49')
    for (const s of secRes.data || []) {
      if (!s.code || !s.name) continue;
      const codeStr = String(s.code).trim();
      map.set(codeStr, s.name);
      if (codeStr.includes('-')) {
        const [start, end] = codeStr.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            map.set(String(i), s.name);
          }
        }
      }
    }

    return map;
  })().catch(err => {
    naicsMapPromise = null;
    throw err;
  });

  return naicsMapPromise;
}

/**
 * Resolves a NAICS code to its database-provided title.
 * Directly references the database records loaded in naicsMap (or sectorsTree).
 * Supports exact matches and prefix matching for 5/6 digit codes.
 */
export function getNaicsName(code, lookupSource) {
  if (!code || !lookupSource) return null;
  const c = String(code).trim();

  // If lookupSource is a Map returned from fetchNaicsMap()
  if (lookupSource instanceof Map) {
    if (lookupSource.has(c)) return lookupSource.get(c);
    if (c.length > 4 && lookupSource.has(c.slice(0, 4))) return lookupSource.get(c.slice(0, 4));
    if (c.length > 3 && lookupSource.has(c.slice(0, 3))) return lookupSource.get(c.slice(0, 3));
    if (c.length > 2 && lookupSource.has(c.slice(0, 2))) return lookupSource.get(c.slice(0, 2));
    return null;
  }

  // If lookupSource is an array / sectorsTree
  if (Array.isArray(lookupSource)) {
    const sector = lookupSource.find(s => s.code === c || (s.code.includes('-') && c.length === 2 && s.code.startsWith(c.slice(0, 1))));
    if (sector && (sector.code === c || c.length === 2)) return sector.name;

    for (const s of lookupSource) {
      const sub = s.subsectors?.find(sub => sub.code === c || (c.length > 3 && sub.code === c.slice(0, 3)));
      if (sub && sub.code === c) return sub.name;

      if (s.subsectors) {
        for (const subsector of s.subsectors) {
          if (subsector.industryGroups) {
            const ig = subsector.industryGroups.find(ig => ig.code === c || (c.length > 4 && ig.code === c.slice(0, 4)));
            if (ig) return ig.name;
          }
        }
      }
      if (sub) return sub.name;
    }
  }

  return null;
}

