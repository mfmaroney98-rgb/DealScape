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
  console.log('[Cleanup] Deleting existing buyer_criteria entries for Resilience Capital Partners...');
  try {
    const res = await sql`
      DELETE FROM public.buyer_criteria
      WHERE investment_criteria_name LIKE 'Resilience Capital Partners%'
      RETURNING id, investment_criteria_name;
    `;
    console.log(`[Cleanup] Deleted ${res.length} records:`, res);
  } catch (err) {
    console.error('[Cleanup] Error during deletion:', err.message);
  } finally {
    await sql.end();
  }
}

main();
