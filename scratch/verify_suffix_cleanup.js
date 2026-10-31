import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function verify() {
  const remaining = await sql`
    SELECT id, organization_name 
    FROM organizations 
    WHERE organization_name ~* '[,\s]+(llc|l\.l\.c\.|inc\.|inc|incorporated|corp\.|corp|corporation|lp|l\.p\.|llp|l\.l\.p\.|ltd\.|ltd|limited|plc)\.?$'
  `;
  console.log(`Remaining organizations with legal suffixes: ${remaining.length}`);
  if (remaining.length > 0) {
    console.log(remaining.slice(0, 10));
  }

  const sample = await sql`
    SELECT organization_name, created_at 
    FROM organizations 
    ORDER BY random() 
    LIMIT 10;
  `;
  console.log('\nRandom sample of 10 clean organization names:');
  sample.forEach(s => console.log(' - ' + s.organization_name));

  const count = await sql`SELECT count(*) FROM organizations;`;
  console.log(`\nTotal organizations in DB: ${count[0].count}`);

  await sql.end();
}

verify();
