import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

function cleanSuffix(name) {
  if (!name) return name;
  let s = name.trim();

  // Pattern to repeatedly strip trailing legal entity suffixes and trailing punctuation
  const regexList = [
    // Trailing LLC / L.L.C. / LLP / LP / L.P.
    /[,\s]+(?:l\.l\.c\.|llc|l\.p\.|lp|l\.l\.p\.|llp|p\.l\.c\.|plc)\.?$/i,
    // Trailing Inc / Incorporated
    /[,\s]+(?:inc\.|inc|incorporated)\.?$/i,
    // Trailing Corp / Corporation
    /[,\s]+(?:corp\.|corp|corporation)\.?$/i,
    // Trailing Ltd / Limited
    /[,\s]+(?:ltd\.|ltd|limited)\.?$/i,
    // Trailing Co / Company (only if preceded by comma or space after a company name)
    /[,\s]+(?:co\.|co|company)\.?$/i,
    // Trailing GP / G.P.
    /[,\s]+(?:g\.p\.|gp)\.?$/i
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const reg of regexList) {
      if (reg.test(s)) {
        s = s.replace(reg, '').trim();
        changed = true;
      }
    }
  }

  // Clean trailing commas, periods, dashes
  s = s.replace(/[,\.\-\s]+$/, '').trim();

  return s;
}

async function analyzeSuffixCleanup() {
  const orgs = await sql`
    SELECT id, organization_name, website_url, buyer_type, type, created_at,
           (SELECT count(*) FROM buyer_criteria bc WHERE bc.organization_id = o.id) AS criteria_count
    FROM organizations o
    ORDER BY organization_name ASC;
  `;

  console.log(`Loaded ${orgs.length} organizations.`);

  const toClean = [];
  const cleanToOriginals = new Map();

  for (const org of orgs) {
    const orig = org.organization_name;
    const cleaned = cleanSuffix(orig);

    if (cleaned !== orig && cleaned.length > 0) {
      toClean.push({
        id: org.id,
        orig,
        cleaned,
        criteria_count: parseInt(org.criteria_count),
        website: org.website_url
      });
    }

    const key = (cleaned || orig).toLowerCase();
    if (!cleanToOriginals.has(key)) cleanToOriginals.set(key, []);
    cleanToOriginals.get(key).push({ org, cleaned: cleaned || orig });
  }

  console.log(`Organizations with suffixes to clean: ${toClean.length} (out of ${orgs.length})`);

  // Check for collisions (where cleaning creates duplicate names)
  const collisions = [];
  for (const [key, list] of cleanToOriginals.entries()) {
    if (list.length > 1) {
      collisions.push({
        cleanedName: list[0].cleaned,
        items: list.map(x => ({
          id: x.org.id,
          original: x.org.organization_name,
          website: x.org.website_url,
          criteria_count: x.org.criteria_count
        }))
      });
    }
  }

  console.log(`Collisions detected (where cleaning results in same name as another org): ${collisions.length}`);

  fs.writeFileSync('scratch/suffix_cleanup_preview.json', JSON.stringify({
    totalToClean: toClean.length,
    collisions,
    samples: toClean.slice(0, 50)
  }, null, 2));

  console.log('\n--- SAMPLE CLEANUPS (First 25) ---');
  toClean.slice(0, 25).forEach(c => {
    console.log(`"${c.orig}" -> "${c.cleaned}"`);
  });

  if (collisions.length > 0) {
    console.log('\n--- SAMPLE COLLISIONS ---');
    collisions.slice(0, 10).forEach(col => {
      console.log(`\nColliding on "${col.cleanedName}":`);
      col.items.forEach(it => {
        console.log(`  - [${it.id}] "${it.original}" (Web: ${it.website || 'N/A'}, Crit: ${it.criteria_count})`);
      });
    });
  }

  await sql.end();
}

analyzeSuffixCleanup();
