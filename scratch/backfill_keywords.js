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
  console.log('[Migration] Starting keywords array backfill on existing records...');

  try {
    // 1. Fetch all buyer_criteria records
    const records = await sql`
      SELECT id, investment_criteria_name, categorized_keywords FROM public.buyer_criteria;
    `;

    console.log(`[Migration] Read ${records.length} criteria records from the database.`);

    let updateCount = 0;

    for (const record of records) {
      const catKeywords = record.categorized_keywords || {};
      
      // Flatten
      const flattenedKeywords = Object.values(catKeywords)
        .flat()
        .filter(Boolean)
        .map(kw => String(kw).trim());

      console.log(`[Migration] Updating "${record.investment_criteria_name}" with ${flattenedKeywords.length} keywords...`);

      // Update record in database
      await sql`
        UPDATE public.buyer_criteria
        SET keywords = ${flattenedKeywords},
            updated_at = NOW()
        WHERE id = ${record.id};
      `;

      updateCount++;
    }

    console.log(`[Migration] Done! Backfilled ${updateCount} buyer_criteria records.`);

  } catch (err) {
    console.error('[Migration] Failed to run backfill script:', err.message);
  } finally {
    await sql.end();
  }
}

main();
