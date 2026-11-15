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
  const [res] = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE embedding_model IS NULL AND (
          jsonb_array_length(COALESCE(categorized_keywords->'business_model', '[]'::jsonb)) > 0
          OR jsonb_array_length(COALESCE(categorized_keywords->'revenue_model', '[]'::jsonb)) > 0
        )
      )::int AS unembedded_model,
      COUNT(*) FILTER (
        WHERE embedding_target IS NULL AND (
          jsonb_array_length(COALESCE(categorized_keywords->'customer_type', '[]'::jsonb)) > 0
          OR jsonb_array_length(COALESCE(categorized_keywords->'end_market', '[]'::jsonb)) > 0
        )
      )::int AS unembedded_target
    FROM public.buyer_criteria
  `;
  console.log('Unembedded non-empty keyword rows:', res);
  await sql.end();
}

main().catch(async err => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
