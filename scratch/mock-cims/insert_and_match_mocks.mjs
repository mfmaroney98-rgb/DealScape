import fs from 'fs';
import postgres from 'file:///C:/DealScape/node_modules/postgres/src/index.js';
import OpenAI from 'file:///C:/DealScape/node_modules/openai/index.mjs';

const envContent = fs.readFileSync('C:/DealScape/.env', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });
const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });

const CORP_ORG_ID = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d';
const NAICS_2017_TO_2022_MAP = {
  '5112': '5132', '5111': '5131', '5151': '5161', '5191': '5192',
  '4481': '4581', '4482': '4582', '4483': '4583', '4421': '4491',
  '4422': '4491', '4431': '4492', '4511': '4591', '4512': '4592',
  '4531': '4593', '4532': '4594', '4533': '4595', '4539': '4599',
  '4541': '4599', '5172': '5171', '5173': '5171', '5179': '5171',
  '5319': '5313'
};

function normalizeAndExpandNaics(codes) {
  const set = new Set();
  for (const raw of codes || []) {
    const four = String(raw).slice(0, 4);
    const norm = NAICS_2017_TO_2022_MAP[four] || four;
    if (norm.length >= 2) set.add(norm.slice(0, 2));
    if (norm.length >= 3) set.add(norm.slice(0, 3));
    if (norm.length >= 4) set.add(norm.slice(0, 4));
  }
  return [...set];
}

async function generateEmbedding(text) {
  if (!text || !text.trim()) return null;
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim()
  });
  return res.data[0].embedding;
}

async function main() {
  const evalResults = JSON.parse(fs.readFileSync('C:/DealScape/scratch/mock-cims/eval_results.json', 'utf8'));

  const authUsers = await sql`SELECT id FROM auth.users LIMIT 1`;
  const userId = authUsers[0].id;

  const insertedIds = {};

  for (const item of evalResults) {
    const ex = item.extracted;
    const naicsCodes = normalizeAndExpandNaics(ex.naics_codes);
    const flatKeywords = (ex.keywords && typeof ex.keywords === 'object')
      ? Object.values(ex.keywords).flat().filter(Boolean)
      : [];

    const industryText = (ex.keywords?.industry || []).join(', ');
    const modelText = [...(ex.keywords?.business_model || []), ...(ex.keywords?.revenue_model || [])].join(', ');
    const targetText = [...(ex.keywords?.customer_type || []), ...(ex.keywords?.end_market || [])].join(', ');

    const [industryVec, modelVec, targetVec] = await Promise.all([
      generateEmbedding(industryText),
      generateEmbedding(modelText),
      generateEmbedding(targetText)
    ]);
    const toPgVec = v => (v ? `[${v.join(',')}]` : null);

    // Compute search_capex_pct from FY0
    const fy0 = ex.financial_history?.FY0 || {};
    const capexPct = (fy0.capex != null && fy0.revenue) ? (Number(fy0.capex) / Number(fy0.revenue)) : null;

    // Use seller_anon_name for blind teaser if seller_name is null so we can identify it
    const displayName = ex.seller_name || `[MOCK BLIND] ${ex.seller_anon_name}`;

    // Upsert by seller_anon_name + organization_id
    const existing = await sql`
      SELECT id FROM public.seller_listings
      WHERE organization_id = ${CORP_ORG_ID} AND seller_anon_name = ${ex.seller_anon_name}
      LIMIT 1
    `;

    let listingId;
    if (existing.length > 0) {
      listingId = existing[0].id;
      await sql`
        UPDATE public.seller_listings SET
          seller_name = ${displayName},
          summary = ${ex.summary},
          employees_count = ${ex.employees_count},
          year_founded = ${ex.year_founded ? String(ex.year_founded) : null},
          legal_entity = ${ex.legal_entity},
          naics_codes = ${naicsCodes},
          locations = ${ex.locations || []},
          keywords = ${flatKeywords.join(', ')},
          categorized_keywords = ${sql.json(ex.keywords || {})},
          pref_transaction_type = ${ex.pref_transaction_type || []},
          is_founder_owned = ${ex.is_founder_owned ?? false},
          is_female_owned = ${ex.is_female_owned ?? false},
          is_minority_owned = ${ex.is_minority_owned ?? false},
          is_family_owned = ${ex.is_family_owned ?? false},
          is_operator_owned = ${ex.is_operator_owned ?? false},
          financial_history = ${sql.json(ex.financial_history || {})},
          search_capex_pct = ${capexPct},
          status = 'Active',
          embedding_industry = ${toPgVec(industryVec)}::vector,
          embedding_model = ${toPgVec(modelVec)}::vector,
          embedding_target = ${toPgVec(targetVec)}::vector,
          last_embedded_text = ${JSON.stringify(ex.keywords || {})},
          updated_at = NOW()
        WHERE id = ${listingId}
      `;
    } else {
      const ins = await sql`
        INSERT INTO public.seller_listings (
          user_id, organization_id, seller_name, seller_anon_name, summary,
          employees_count, year_founded, legal_entity, naics_codes,
          locations, keywords, categorized_keywords, pref_transaction_type,
          is_founder_owned, is_female_owned, is_minority_owned, is_family_owned, is_operator_owned,
          financial_history, search_capex_pct, status,
          embedding_industry, embedding_model, embedding_target, last_embedded_text, updated_at
        ) VALUES (
          ${userId}, ${CORP_ORG_ID}, ${displayName}, ${ex.seller_anon_name}, ${ex.summary},
          ${ex.employees_count}, ${ex.year_founded ? String(ex.year_founded) : null}, ${ex.legal_entity}, ${naicsCodes},
          ${ex.locations || []}, ${flatKeywords.join(', ')}, ${sql.json(ex.keywords || {})}, ${ex.pref_transaction_type || []},
          ${ex.is_founder_owned ?? false}, ${ex.is_female_owned ?? false}, ${ex.is_minority_owned ?? false}, ${ex.is_family_owned ?? false}, ${ex.is_operator_owned ?? false},
          ${sql.json(ex.financial_history || {})}, ${capexPct}, ${'Active'},
          ${toPgVec(industryVec)}::vector, ${toPgVec(modelVec)}::vector, ${toPgVec(targetVec)}::vector, ${JSON.stringify(ex.keywords || {})}, NOW()
        )
        RETURNING id
      `;
      listingId = ins[0].id;
    }

    insertedIds[listingId] = { dealId: item.id, name: displayName, target_buyer: item.target_buyer };
    console.log(`Saved Active listing [${item.id}] -> ${listingId} (${displayName})`);
  }

  // Run Stage 1 matching for key buyer criteria
  const criteriaList = await sql`
    SELECT id, investment_criteria_name
    FROM public.buyer_criteria
    WHERE id IN (
      'bdf8da27-9bd3-4a95-ab77-b54dfe045c68',
      '1757f705-a56b-461b-9191-7f0d0c9f3f0a',
      'd88af98b-4932-4011-b301-946e1ef4c73b'
    )
    OR investment_criteria_name ILIKE '%Healthcare%'
    LIMIT 6
  `;

  console.log('\n=== STAGE 1 MATCHING RESULTS FOR MOCK CIMs ===');
  for (const crit of criteriaList) {
    const candidates = await sql`
      SELECT * FROM public.get_stage1_candidates(${crit.id}::uuid, 50)
    `;
    console.log(`\nBuyer Criteria: "${crit.investment_criteria_name}" (${crit.id}) — Total candidates: ${candidates.length}`);
    candidates.forEach((c, idx) => {
      if (insertedIds[c.listing_id]) {
        const m = insertedIds[c.listing_id];
        console.log(`  Rank #${idx + 1}: [${m.dealId}] ${m.name} | Stage1 Score: ${c.stage1_score} (expected target: ${m.target_buyer})`);
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
