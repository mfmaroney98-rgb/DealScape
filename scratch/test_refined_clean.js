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
    // Trailing LLC / L.L.C. / LLP / LP / L.P. / PLC / P.L.C.
    /[,\s]+(?:l\.l\.c\.|llc|l\.p\.|lp|l\.l\.p\.|llp|p\.l\.c\.|plc)\.?$/i,
    // Trailing Inc / Incorporated
    /[,\s]+(?:inc\.|inc|incorporated)\.?$/i,
    // Trailing Corp / Corporation
    /[,\s]+(?:corp\.|corp|corporation)\.?$/i,
    // Trailing Ltd / Limited
    /[,\s]+(?:ltd\.|ltd|limited)\.?$/i,
    // Trailing GP / G.P.
    /[,\s]+(?:g\.p\.|gp)\.?$/i,
    // Trailing PC / P.C.
    /[,\s]+(?:p\.c\.|pc)\.?$/i,
    // Trailing SA / S.A. / BV / B.V. / GmbH
    /[,\s]+(?:s\.a\.|sa|b\.v\.|bv|gmbh)\.?$/i
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

async function testClean() {
  const orgs = await sql`
    SELECT id, organization_name, website_url,
           (SELECT count(*) FROM buyer_criteria bc WHERE bc.organization_id = o.id) AS criteria_count
    FROM organizations o
    ORDER BY organization_name ASC;
  `;

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

  console.log(`Total organizations: ${orgs.length}`);
  console.log(`Organizations with legal suffixes to strip: ${toClean.length}`);
  console.log(`Collisions resulting from suffix stripping: ${collisions.length}`);

  collisions.forEach(col => {
    console.log(`\nCollision on: "${col.cleanedName}"`);
    col.items.forEach(it => {
      console.log(`  - [${it.id}] "${it.original}" (Web: ${it.website || 'N/A'}, Crit: ${it.criteria_count})`);
    });
  });

  await sql.end();
}

testClean();
