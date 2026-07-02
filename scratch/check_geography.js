import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Parse .env manually from DealScape project root
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error(`Missing .env file at ${envPath}`);
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
if (!dbUrl) {
  console.error('DATABASE_URL is missing in .env file.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function main() {
  console.log('[Info] Querying North America countries and states from database...');
  try {
    const countries = await sql`
      SELECT code, name FROM public.global_countries WHERE continent = 'North America';
    `;
    console.log('Countries in North America:', countries);

    for (const country of countries) {
      const states = await sql`
        SELECT COUNT(*)::integer as count FROM public.global_states WHERE country_code = ${country.code};
      `;
      console.log(` -> ${country.name} (${country.code}) has ${states[0].count} states/provinces.`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}

main();
