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
  // Fetch sectors
  const { data: sectors, error: sectorsError } = await supabase
    .from('naics_sectors')
    .select('code, name')
    .order('code');

  if (sectorsError) throw sectorsError;

  // Fetch all subsectors
  const { data: subsectors, error: subsectorsError } = await supabase
    .from('naics_subsectors')
    .select('code, name, sector_code')
    .order('code');

  if (subsectorsError) throw subsectorsError;

  // Join subsectors into their parent sectors
  return sectors.map(sector => ({
    code: sector.code,
    name: sector.name,
    subsectors: subsectors
      .filter(sub => sub.sector_code === sector.code)
      .map(sub => ({ code: sub.code, name: sub.name }))
  }));
}
