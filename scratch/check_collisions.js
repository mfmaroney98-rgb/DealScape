import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkCollisions() {
  const cs = await sql`
    SELECT id, organization_id, organization_name, investment_criteria_name
    FROM buyer_criteria
    WHERE organization_id IN ('f301553e-6f5b-428a-b464-07b54957a975', 'e7280de0-2385-47ca-a975-35f86f352f02');
  `;
  console.log('CS Capital Partners criteria:', cs);

  const granite = await sql`
    SELECT id, organization_id, organization_name, investment_criteria_name
    FROM buyer_criteria
    WHERE organization_id IN ('7dbfab89-b31a-4868-aa55-da6fb20c2643', 'aa5b7488-3652-459b-abd9-112872e82145');
  `;
  console.log('Granite Capital Partners criteria:', granite);

  await sql.end();
}

checkCollisions();
