import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkAlignDetails() {
  const criteria = await sql`
    SELECT id, organization_id, organization_name, investment_criteria_name, categorized_keywords, financial_criteria
    FROM buyer_criteria
    WHERE organization_id IN ('2b347b15-ba7b-4e81-98dd-65d9e57a30b0', '54905390-63e4-417a-88d9-81d8e8a85974')
    ORDER BY investment_criteria_name;
  `;
  for (const c of criteria) {
    console.log(`\nID: ${c.id}`);
    console.log(`Org: ${c.organization_id} (${c.organization_name})`);
    console.log(`Name: "${c.investment_criteria_name}"`);
    console.log(`Financial:`, JSON.stringify(c.financial_criteria));
    console.log(`Keywords:`, JSON.stringify(c.categorized_keywords)?.slice(0, 100));
  }
  await sql.end();
}

checkAlignDetails();
