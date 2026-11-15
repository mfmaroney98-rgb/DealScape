import fs from 'fs';
import postgres from 'file:///C:/DealScape/node_modules/postgres/src/index.js';

const envContent = fs.readFileSync('C:/DealScape/.env', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

const MOCKS = {
  'c2a17376-137b-42ae-a9d8-97bbb5e4425f': 'deal1 Apex ColdChain',
  '61c94bb4-9955-40af-8162-55bec9ec97fa': 'deal2 Heartland HVAC',
  'e3050bdf-ebb1-4558-9657-c0fd53ab33d1': 'deal3 Blind Healthcare RCM',
  '427f4922-2eb2-4249-829c-3c826ff44c15': 'deal4 Verdant Pet Nutrition',
  '5bbf989f-cf75-4d61-9452-5f89ed1dd711': 'deal5 Great Lakes Tooling'
};

const TARGET_CRITERIA = [
  'bdf8da27-9bd3-4a95-ab77-b54dfe045c68',
  '1757f705-a56b-461b-9191-7f0d0c9f3f0a',
  'd88af98b-4932-4011-b301-946e1ef4c73b',
  'b544dd43-a1da-459a-a36b-47c05df990c2',
  '513cbd38-fd7b-404b-ba45-09983a5bad8a'
];

async function main() {
  const mig = fs.readFileSync('C:/DealScape/supabase/migrations/20261114010000_normalize_stage1_semantic_weights.sql', 'utf8');
  await sql.unsafe(mig);
  console.log('Migration 20261114010000_normalize_stage1_semantic_weights.sql applied.\n');

  for (const cid of TARGET_CRITERIA) {
    const [crit] = await sql`SELECT investment_criteria_name FROM public.buyer_criteria WHERE id = ${cid}::uuid`;
    const rows = await sql`SELECT * FROM public.get_stage1_candidates(${cid}::uuid, 50)`;
    console.log(`Criteria: "${crit.investment_criteria_name}" | Total: ${rows.length}`);
    rows.forEach((r, i) => {
      if (MOCKS[r.listing_id]) {
        console.log(`  Rank #${i + 1}: ${MOCKS[r.listing_id]} | Stage1: ${r.stage1_score} (Fin:${r.financial_score}, Geo:${r.geography_score}, NAICS:${r.industry_score})`);
      }
    });
  }

  await sql.end();
}

main().catch(async err => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
