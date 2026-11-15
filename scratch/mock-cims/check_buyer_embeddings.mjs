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
  const [counts] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(embedding_industry)::int AS has_industry,
      COUNT(embedding_model)::int AS has_model,
      COUNT(embedding_target)::int AS has_target,
      COUNT(CASE WHEN categorized_keywords IS NOT NULL AND categorized_keywords != '{}'::jsonb THEN 1 END)::int AS has_cat_kw,
      COUNT(CASE WHEN keywords IS NOT NULL AND array_length(keywords, 1) > 0 THEN 1 END)::int AS has_flat_kw
    FROM public.buyer_criteria
  `;
  console.log('Buyer criteria counts:', counts);

  const missing = await sql`
    SELECT id, investment_criteria_name,
      categorized_keywords IS NOT NULL AND categorized_keywords != '{}'::jsonb AS has_cat,
      array_length(keywords, 1) AS flat_kw_len,
      embedding_industry IS NULL AS miss_ind,
      embedding_model IS NULL AS miss_mod,
      embedding_target IS NULL AS miss_tgt
    FROM public.buyer_criteria
    WHERE embedding_industry IS NULL OR embedding_model IS NULL OR embedding_target IS NULL
    LIMIT 20
  `;
  console.log('Sample rows with missing embeddings:', missing);
  await sql.end();
}

main().catch(async err => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
