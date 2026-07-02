import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Parse .env manually from DealScape project root
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('Error: .env not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const dbUrl = env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: 'require' });

async function main() {
  console.log('[Info] Querying naics_sectors from database...');
  try {
    const sectors = await sql`
      SELECT code, name FROM public.naics_sectors ORDER BY code;
    `;
    console.log('Sectors in naics_sectors:', sectors);

    const subsectors = await sql`
      SELECT code, name, sector_code FROM public.naics_subsectors LIMIT 20;
    `;
    console.log('Sample subsectors:', subsectors);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}

main();
