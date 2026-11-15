import fs from 'fs';
import postgres from 'file:///C:/DealScape/node_modules/postgres/src/index.js';

const envContent = fs.readFileSync('C:/DealScape/.env', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function main() {
  const mig = fs.readFileSync('C:/DealScape/supabase/migrations/20261114020000_add_seller_listings_organization_name.sql', 'utf8');
  await sql.unsafe(mig);

  const sample = await sql`
    SELECT id, seller_name, organization_id, organization_name
    FROM public.seller_listings
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('Backfilled seller_listings sample:', sample);
  await sql.end();
}

main().catch(async err => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
