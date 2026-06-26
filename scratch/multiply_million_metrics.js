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

// Multiplies by 1M if value is small (e.g. between 1 and 1000)
function checkAndMultiply(val) {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 0 && num < 1000) {
    return num * 1000000;
  }
  return num;
}

async function main() {
  console.log('[Migration] Starting normalization of relative numbers to absolute dollars on buyer_criteria...');

  try {
    const records = await sql`
      SELECT 
        id, 
        investment_criteria_name, 
        search_revenue_min, 
        search_revenue_max, 
        search_ebitda_min, 
        search_ebitda_max,
        categorized_keywords,
        financial_criteria
      FROM public.buyer_criteria;
    `;

    console.log(`[Migration] Read ${records.length} criteria records from the database.`);
    let updateCount = 0;

    for (const record of records) {
      const revMin = checkAndMultiply(record.search_revenue_min);
      const revMax = checkAndMultiply(record.search_revenue_max);
      const ebitdaMin = checkAndMultiply(record.search_ebitda_min);
      const ebitdaMax = checkAndMultiply(record.search_ebitda_max);

      let changed = (
        revMin !== record.search_revenue_min ||
        revMax !== record.search_revenue_max ||
        ebitdaMin !== record.search_ebitda_min ||
        ebitdaMax !== record.search_ebitda_max
      );

      // Process categorized_keywords -> additional_financials
      const catKeywords = { ...(record.categorized_keywords || {}) };
      if (catKeywords.additional_financials) {
        const af = { ...catKeywords.additional_financials };
        const evMin = checkAndMultiply(af.search_ev_min);
        const evMax = checkAndMultiply(af.search_ev_max);
        const eqMin = checkAndMultiply(af.equity_check_min);
        const eqMax = checkAndMultiply(af.equity_check_max);

        if (
          evMin !== af.search_ev_min ||
          evMax !== af.search_ev_max ||
          eqMin !== af.equity_check_min ||
          eqMax !== af.equity_check_max
        ) {
          af.search_ev_min = evMin;
          af.search_ev_max = evMax;
          af.equity_check_min = eqMin;
          af.equity_check_max = eqMax;
          catKeywords.additional_financials = af;
          changed = true;
        }
      }

      // Process financial_criteria JSON array
      let finCriteria = Array.isArray(record.financial_criteria) ? [...record.financial_criteria] : [];
      let finCriteriaChanged = false;
      
      finCriteria = finCriteria.map(fc => {
        const metricLower = (fc.metric || '').toLowerCase();
        const isPct = metricLower.includes('margin') || metricLower.includes('growth') || metricLower.includes('%') || metricLower.includes('cagr');
        
        // Only scale absolute dollar metrics (not percentages/margins)
        if (!isPct) {
          const rawMin = fc.min !== '' && fc.min !== null ? Number(fc.min) : null;
          const rawMax = fc.max !== '' && fc.max !== null ? Number(fc.max) : null;

          const updatedMin = checkAndMultiply(rawMin);
          const updatedMax = checkAndMultiply(rawMax);

          if (updatedMin !== rawMin || updatedMax !== rawMax) {
            finCriteriaChanged = true;
            return {
              ...fc,
              min: updatedMin !== null ? String(updatedMin) : '',
              max: updatedMax !== null ? String(updatedMax) : ''
            };
          }
        }
        return fc;
      });

      if (finCriteriaChanged) {
        changed = true;
      }

      if (changed) {
        console.log(`[Migration] Updating "${record.investment_criteria_name}" (ID: ${record.id}) to absolute dollars:`);
        if (revMin !== record.search_revenue_min) console.log(`  -> Revenue Min: ${record.search_revenue_min} -> ${revMin}`);
        if (revMax !== record.search_revenue_max) console.log(`  -> Revenue Max: ${record.search_revenue_max} -> ${revMax}`);
        if (ebitdaMin !== record.search_ebitda_min) console.log(`  -> EBITDA Min: ${record.search_ebitda_min} -> ${ebitdaMin}`);
        if (ebitdaMax !== record.search_ebitda_max) console.log(`  -> EBITDA Max: ${record.search_ebitda_max} -> ${ebitdaMax}`);

        await sql`
          UPDATE public.buyer_criteria
          SET search_revenue_min = ${revMin},
              search_revenue_max = ${revMax},
              search_ebitda_min = ${ebitdaMin},
              search_ebitda_max = ${ebitdaMax},
              categorized_keywords = ${sql.json(catKeywords)},
              financial_criteria = ${sql.json(finCriteria)},
              updated_at = NOW()
          WHERE id = ${record.id};
        `;
        updateCount++;
      }
    }

    console.log(`[Migration] Done! Updated ${updateCount} records with absolute dollar values.`);

  } catch (err) {
    console.error('[Migration] Failed to run relative scaling script:', err.message);
  } finally {
    await sql.end();
  }
}

main();
