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
