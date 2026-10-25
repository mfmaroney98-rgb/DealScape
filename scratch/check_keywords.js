import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function check() {
  const otherSample = await sql`
    SELECT id, investment_criteria_name, keywords, categorized_keywords 
    FROM buyer_criteria 
    WHERE organization_id != '27b0d4c3-ddd9-415c-9478-d1b5e84b530d' 
      AND (keywords IS NOT NULL OR categorized_keywords IS NOT NULL)
    LIMIT 3;
  `;
  console.log('Existing Database Samples:');
  console.log(JSON.stringify(otherSample, null, 2));

  // Check column types for buyer_criteria
  const cols = await sql`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'buyer_criteria' AND column_name IN ('keywords', 'categorized_keywords');
  `;
  console.log('Columns:');
  console.log(JSON.stringify(cols, null, 2));

  await sql.end();
}

check();
