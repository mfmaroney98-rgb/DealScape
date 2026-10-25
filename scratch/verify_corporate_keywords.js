import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkCorporate() {
  const records = await sql`
    SELECT id, investment_criteria_name, keywords, categorized_keywords
    FROM buyer_criteria
    WHERE organization_id = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d';
  `;

  for (const r of records) {
    console.log(`\n=============================`);
    console.log(`Criteria: ${r.investment_criteria_name}`);
    console.log(`keywords count: ${r.keywords ? r.keywords.length : 0}`);
    console.log(`categorized_keywords keys:`, Object.keys(r.categorized_keywords || {}));
    console.log(`Sample industry keywords:`, (r.categorized_keywords?.industry || []).slice(0, 3));
    console.log(`Sample business_model keywords:`, (r.categorized_keywords?.business_model || []).slice(0, 3));
    console.log(`Sample differentiation keywords:`, (r.categorized_keywords?.differentiation || []).slice(0, 3));
  }

  await sql.end();
}

checkCorporate();
