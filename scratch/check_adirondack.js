import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://laialzrtgfveczgemjto.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhaWFsenJ0Z2Z2ZWN6Z2VtanRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNjkwNSwiZXhwIjoyMDkwMjAyOTA1fQ.q1LcVanlDKZf2L_Rw3qqFnnxB8n1HdBK3ZVd4usiNaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('*')
    .or('organization_name.ilike.%adirondack%,organization_name.ilike.%dealscape%');

  console.log('--- ORGANIZATIONS ---');
  console.log(JSON.stringify(orgs, null, 2));

  const { data: crit, error: critErr } = await supabase
    .from('buyer_criteria')
    .select('*')
    .or('investment_criteria_name.ilike.%adirondack%,investment_criteria_name.ilike.%dealscape%,organization_name.ilike.%adirondack%');

  console.log('--- BUYER CRITERIA ---');
  console.log(JSON.stringify(crit, null, 2));
}

main().catch(console.error);

