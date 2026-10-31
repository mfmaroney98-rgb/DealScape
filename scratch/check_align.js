import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkAlign() {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'buyer_criteria';
  `;
  console.log('Columns:', cols.map(c => c.column_name));

  const criteria = await sql`
    SELECT id, organization_id, organization_name, created_at, investment_criteria_name
    FROM buyer_criteria
    WHERE organization_id IN ('2b347b15-ba7b-4e81-98dd-65d9e57a30b0', '54905390-63e4-417a-88d9-81d8e8a85974')
    ORDER BY created_at;
  `;
  console.log('Align criteria:');
  for (const c of criteria) {
    console.log(`[Org ${c.organization_id}] ID: ${c.id} | OrgName: "${c.organization_name}" | Name: "${c.investment_criteria_name}" | Created: ${c.created_at}`);
  }
  await sql.end();
}

checkAlign();
