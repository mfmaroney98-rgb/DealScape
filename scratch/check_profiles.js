import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

async function checkProfiles() {
  const usersWithOrgs = await sql`
    SELECT up.id, up.organization_id, o.organization_name
    FROM user_profiles up
    JOIN organizations o ON o.id = up.organization_id;
  `;
  console.log('Profiles with organizations:', usersWithOrgs);
  await sql.end();
}

checkProfiles();
