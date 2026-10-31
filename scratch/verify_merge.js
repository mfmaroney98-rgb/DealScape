import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function verify() {
  const align = await sql`SELECT id, organization_name FROM organizations WHERE organization_name ILIKE '%Align Capital%'`;
  console.log('Align organizations now:', align);

  const shore = await sql`SELECT id, organization_name FROM organizations WHERE organization_name ILIKE '%Shore Capital%'`;
  console.log('Shore organizations now:', shore);

  const genstar = await sql`SELECT id, organization_name FROM organizations WHERE organization_name ILIKE '%Genstar%'`;
  console.log('Genstar organizations now:', genstar);

  const svoboda = await sql`SELECT id, organization_name FROM organizations WHERE organization_name ILIKE '%Svoboda%'`;
  console.log('Svoboda organizations now:', svoboda);

  const tecum = await sql`SELECT id, organization_name FROM organizations WHERE organization_name ILIKE '%Tecum%'`;
  console.log('Tecum organizations now:', tecum);

  const total = await sql`SELECT count(*) FROM organizations`;
  console.log('Total organizations count now:', total[0].count);

  await sql.end();
}

verify();
