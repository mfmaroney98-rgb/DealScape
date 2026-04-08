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
 * Fetches all countries (with continent) and their states from Supabase,
 * returning a 3-level hierarchy:
 * [
 *   {
 *     name: 'North America',
 *     countries: [
 *       { code: 'US', name: 'United States', states: ['Alabama', ...] },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
export async function fetchGeographyTree() {
  const [{ data: countries, error: countriesError }, states] = await Promise.all([
    supabase.from('global_countries').select('code, name, continent').order('name'),
    fetchAllStates()
  ]);

  if (countriesError) throw countriesError;

  // Build continent → countries map, skipping countries with no states
  const continentMap = {};
  for (const country of countries) {
    const countryStates = states
      .filter(s => s.country_code === country.code)
      .map(s => s.name);

    if (countryStates.length === 0) continue; // skip countries with no state data

    const continentName = country.continent || 'Other';
    if (!continentMap[continentName]) continentMap[continentName] = [];
    continentMap[continentName].push({
      code: country.code,
      name: country.name,
      states: countryStates
    });
  }

  // Return in a defined continent order
  const CONTINENT_ORDER = [
    'North America', 'South America', 'Europe', 'Africa',
    'Asia', 'Oceania', 'Antarctica', 'Other'
  ];

  return CONTINENT_ORDER
    .filter(name => continentMap[name])
    .map(name => ({ name, countries: continentMap[name] }));
}

