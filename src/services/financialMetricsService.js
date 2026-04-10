import { supabase } from '../lib/supabase';

/**
 * Fetches all financial metric names from Supabase, ordered by sort_order.
 * Returns a plain string array: ['Revenue', 'EBITDA', ...]
 */
export async function fetchFinancialMetrics() {
  const { data, error } = await supabase
    .from('financial_metrics')
    .select('name')
    .order('sort_order');

  if (error) throw error;
  return data.map(m => m.name);
}
