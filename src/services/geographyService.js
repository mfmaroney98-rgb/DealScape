import { supabase } from '../lib/supabase';

/**
 * Fetches ALL states from Supabase using pagination (Supabase caps each
 * response at 1000 rows by default, so we loop until exhausted).
 */
async function fetchAllStates() {
  const PAGE_SIZE = 1000;
  let allStates = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('global_states')
      .select('name, country_code')
      .order('name')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allStates = allStates.concat(data);

    // If fewer rows than PAGE_SIZE came back, we've reached the end
    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allStates;
}

/**
 * Fetches all countries and their states from Supabase.
 * Returns an array shaped like:
 * [
 *   { code: 'US', name: 'United States', states: ['Alabama', 'Alaska', ...] },
 *   { code: 'CA', name: 'Canada', states: ['Alberta', 'British Columbia', ...] },
 *   ...
 * ]
 * Only countries that have at least one state entry are returned.
 */
export async function fetchGeographyTree() {
  const [{ data: countries, error: countriesError }, states] = await Promise.all([
    supabase.from('global_countries').select('code, name').order('name'),
    fetchAllStates()
  ]);

  if (countriesError) throw countriesError;

  return countries
    .map(country => ({
      code: country.code,
      name: country.name,
      states: states
        .filter(s => s.country_code === country.code)
        .map(s => s.name)
    }))
    .filter(c => c.states.length > 0);
}
