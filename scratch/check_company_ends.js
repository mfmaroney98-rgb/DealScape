import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkCompanyNames() {
  const orgs = await sql`SELECT organization_name FROM organizations ORDER BY organization_name`;
  const companyEnds = orgs.filter(o => /(?:\bcompany|\bco\.?)$/i.test(o.organization_name.trim()));
  console.log(`Ends with company/co: ${companyEnds.length}`);
  companyEnds.forEach(o => console.log(' - ' + o.organization_name));
  await sql.end();
}

checkCompanyNames();
