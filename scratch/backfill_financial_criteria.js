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
  console.log('[Migration] Starting financial_criteria JSON array backfill on existing records...');

  try {
    // 1. Fetch all buyer_criteria records
    const records = await sql`
      SELECT 
        id, 
        investment_criteria_name, 
        search_revenue_min, 
        search_revenue_max, 
        search_ebitda_min, 
        search_ebitda_max,
        search_ebitda_margin_min,
        search_ebitda_margin_max,
        search_revenue_cagr_min,
        search_revenue_cagr_max,
        financial_criteria
      FROM public.buyer_criteria;
    `;

    console.log(`[Migration] Read ${records.length} criteria records from the database.`);

    let updateCount = 0;

    for (const record of records) {
      const financialCriteriaArray = [];
      let fcIdCounter = 1;

      // Extract existing values
      const revMin = record.search_revenue_min;
      const revMax = record.search_revenue_max;
      const ebitdaMin = record.search_ebitda_min;
      const ebitdaMax = record.search_ebitda_max;
      const marginMin = record.search_ebitda_margin_min;
      const marginMax = record.search_ebitda_margin_max;
      const cagrMin = record.search_revenue_cagr_min;
      const cagrMax = record.search_revenue_cagr_max;

      if (revMin !== null || revMax !== null) {
        financialCriteriaArray.push({
          id: Date.now() + fcIdCounter++,
          metric: 'Revenue',
          min: revMin !== null ? String(revMin) : '',
          max: revMax !== null ? String(revMax) : ''
        });
      }

      if (ebitdaMin !== null || ebitdaMax !== null) {
        financialCriteriaArray.push({
          id: Date.now() + fcIdCounter++,
          metric: 'EBITDA',
          min: ebitdaMin !== null ? String(ebitdaMin) : '',
          max: ebitdaMax !== null ? String(ebitdaMax) : ''
        });
      }

      if (marginMin !== null || marginMax !== null) {
        financialCriteriaArray.push({
          id: Date.now() + fcIdCounter++,
          metric: 'EBITDA Margin',
          min: marginMin !== null ? String(Math.round(marginMin * 100)) : '',
          max: marginMax !== null ? String(Math.round(marginMax * 100)) : ''
        });
      }

      if (cagrMin !== null || cagrMax !== null) {
        financialCriteriaArray.push({
          id: Date.now() + fcIdCounter++,
          metric: 'Revenue CAGR',
          min: cagrMin !== null ? String(Math.round(cagrMin * 100)) : '',
          max: cagrMax !== null ? String(Math.round(cagrMax * 100)) : ''
        });
      }

      console.log(`[Migration] Updating "${record.investment_criteria_name}" with ${financialCriteriaArray.length} metrics...`);

      // Update record in database
      await sql`
        UPDATE public.buyer_criteria
        SET financial_criteria = ${sql.json(financialCriteriaArray)},
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
