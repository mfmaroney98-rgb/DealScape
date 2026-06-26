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
  console.log('[Migration] Starting location expansion on existing buyer_criteria...');

  try {
    // 1. Fetch all buyer_criteria records
    const records = await sql`
      SELECT id, investment_criteria_name, locations FROM public.buyer_criteria;
    `;

    console.log(`[Migration] Read ${records.length} criteria records from the database.`);

    let updateCount = 0;

    for (const record of records) {
      const locations = record.locations || [];
      const hasAll = locations.some(loc => /^[A-Z]{2}:All$/i.test(loc));

      if (!hasAll) {
        continue;
      }

      console.log(`[Migration] Processing record: "${record.investment_criteria_name}" (ID: ${record.id})`);
      const newLocations = [];

      for (const loc of locations) {
        const match = loc.match(/^([A-Z]{2}):All$/i);
        if (match) {
          const countryCode = match[1].toUpperCase();
          console.log(`  -> Expanding "${loc}" to individual states...`);
          
          // Fetch states for country from DB
          const states = await sql`
            SELECT name FROM public.global_states WHERE country_code = ${countryCode};
          `;

          if (states.length > 0) {
            states.forEach(s => {
              newLocations.push(`${countryCode}:${s.name}`);
            });
            console.log(`  -> Added ${states.length} states for ${countryCode}.`);
          } else {
            console.warn(`  -> No states found in database for country: ${countryCode}. Keeping "${loc}".`);
            newLocations.push(loc);
          }
        } else {
          newLocations.push(loc);
        }
      }

      // Deduplicate locations
      const finalLocations = [...new Set(newLocations)];

      // Update record in database
      await sql`
        UPDATE public.buyer_criteria
        SET locations = ${finalLocations},
            updated_at = NOW()
        WHERE id = ${record.id};
      `;

      updateCount++;
    }

    console.log(`[Migration] Done! Updated ${updateCount} buyer_criteria records.`);

  } catch (err) {
    console.error('[Migration] Failed to run update script:', err.message);
  } finally {
    await sql.end();
  }
}

main();
