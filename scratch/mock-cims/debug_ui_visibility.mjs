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
  const policies = await sql`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'seller_listings'
  `;
  console.log('RLS policies on seller_listings:', policies);

  const corpUsers = await sql`
    SELECT up.id, up.email, up.organization_id, up.role
    FROM public.user_profiles up
    WHERE up.organization_id = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d'
  `;
  console.log('DealScape Corporate users:', corpUsers);

  const sampleListings = await sql`
    SELECT id, seller_name, user_id, organization_id, status
    FROM public.seller_listings
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('Recent seller_listings:', sampleListings);

  const updated = await sql`
    UPDATE public.seller_listings
    SET user_id = 'fea16c7b-f14a-4c3d-8fc8-e85b58e372a0'
    WHERE id IN (
      '5bbf989f-cf75-4d61-9452-5f89ed1dd711',
      '427f4922-2eb2-4249-829c-3c826ff44c15',
      'e3050bdf-ebb1-4558-9657-c0fd53ab33d1',
      '61c94bb4-9955-40af-8162-55bec9ec97fa',
      'c2a17376-137b-42ae-a9d8-97bbb5e4425f'
    )
    RETURNING id, seller_name, user_id, status
  `;
  console.log('Updated mock listings:', updated);

  await sql.end();
}

main().catch(async err => {
  console.error(err);
  const updated = await sql`
    UPDATE public.seller_listings
    SET user_id = 'fea16c7b-f14a-4c3d-8fc8-e85b58e372a0'
    WHERE id IN (
      '5bbf989f-cf75-4d61-9452-5f89ed1dd711',
      '427f4922-2eb2-4249-829c-3c826ff44c15',
      'e3050bdf-ebb1-4558-9657-c0fd53ab33d1',
      '61c94bb4-9955-40af-8162-55bec9ec97fa',
      'c2a17376-137b-42ae-a9d8-97bbb5e4425f'
    )
    RETURNING id, seller_name, user_id, status
  `;
  console.log('Updated mock listings:', updated);

  await sql.end();
  process.exit(1);
});
