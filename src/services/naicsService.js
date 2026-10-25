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
    const cleanCode = String(code).trim();
    if (cleanCode.length === 2) {
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

