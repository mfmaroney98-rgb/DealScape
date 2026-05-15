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
