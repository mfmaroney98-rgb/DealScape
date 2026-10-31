import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

function cleanDomain(url) {
  if (!url) return '';
  return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();
}

function normalizeFirmName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  const orgs = await sql`
    SELECT 
      o.id,
      o.organization_name,
      o.website_url,
      o.buyer_type,
      o.created_at,
      (SELECT count(*) FROM user_profiles up WHERE up.organization_id = o.id) AS profiles,
      (SELECT count(*) FROM buyer_criteria bc WHERE bc.organization_id = o.id) AS criteria_count,
      (SELECT count(*) FROM seller_listings sl WHERE sl.organization_id = o.id) AS listing_count
    FROM organizations o
    ORDER BY o.organization_name;
  `;

  const criteria = await sql`
    SELECT id, organization_id, investment_criteria_name
    FROM buyer_criteria;
  `;

  // Map orgId -> list of criteria names
  const orgCriteriaMap = new Map();
  for (const c of criteria) {
    if (!orgCriteriaMap.has(c.organization_id)) orgCriteriaMap.set(c.organization_id, []);
    orgCriteriaMap.get(c.organization_id).push(c.investment_criteria_name);
  }

  // Find duplicates
  const confirmedDuplicates = [];
  const highlyLikelyDuplicates = [];
  const possibleDuplicates = [];

  for (let i = 0; i < orgs.length; i++) {
    for (let j = i + 1; j < orgs.length; j++) {
      const o1 = orgs[i];
      const o2 = orgs[j];

      const norm1 = normalizeFirmName(o1.organization_name);
      const norm2 = normalizeFirmName(o2.organization_name);

      const dom1 = cleanDomain(o1.website_url);
      const dom2 = cleanDomain(o2.website_url);

      const c1 = orgCriteriaMap.get(o1.id) || [];
      const c2 = orgCriteriaMap.get(o2.id) || [];

      // Check criteria overlap (normalized criteria names)
      const normC1 = c1.map(n => (n || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      const normC2 = c2.map(n => (n || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      const commonCriteria = normC1.filter(name => normC2.some(other => name.includes(other) || other.includes(name)));

      const sameDomain = dom1 && dom2 && dom1 === dom2 && dom1.length > 3 && dom1 !== 'linkedin.com';
      const exactNormMatch = norm1 && norm2 && norm1 === norm2;

      // Classify
      if (exactNormMatch && (sameDomain || !dom1 || !dom2)) {
        confirmedDuplicates.push({
          org1: o1,
          org2: o2,
          type: 'Exact Normalized Name Match' + (sameDomain ? ' & Same Domain' : ''),
          domain: dom1 || dom2,
          sharedCriteriaCount: commonCriteria.length,
          criteria1: c1,
          criteria2: c2
        });
      } else if (sameDomain && (norm1.startsWith(norm2) || norm2.startsWith(norm1) || norm1.includes(norm2) || norm2.includes(norm1))) {
        highlyLikelyDuplicates.push({
          org1: o1,
          org2: o2,
          type: 'Same Domain & Substring/Related Name',
          domain: dom1,
          sharedCriteriaCount: commonCriteria.length,
          criteria1: c1,
          criteria2: c2
        });
      } else if (sameDomain && (norm1.replace(/\b(capital|partners|equity|management|holdings|group)\b/g, '').trim() === norm2.replace(/\b(capital|partners|equity|management|holdings|group)\b/g, '').trim())) {
        highlyLikelyDuplicates.push({
          org1: o1,
          org2: o2,
          type: 'Same Domain & Same Core Brand',
          domain: dom1,
          sharedCriteriaCount: commonCriteria.length,
          criteria1: c1,
          criteria2: c2
        });
      }
    }
  }

  console.log(`Confirmed Duplicates (Exact name variation / same domain): ${confirmedDuplicates.length}`);
  console.log(`Highly Likely Duplicates (Same domain & related firm name): ${highlyLikelyDuplicates.length}`);

  fs.writeFileSync('scratch/confirmed_duplicates.json', JSON.stringify(confirmedDuplicates, null, 2));
  fs.writeFileSync('scratch/highly_likely_duplicates.json', JSON.stringify(highlyLikelyDuplicates, null, 2));

  console.log('\n--- CONFIRMED DUPLICATES SAMPLE ---');
  for (const d of confirmedDuplicates.slice(0, 25)) {
    console.log(`- "${d.org1.organization_name}" [${d.org1.id}] (${d.org1.criteria_count} crit, created ${d.org1.created_at?.toISOString().slice(0,10)})`);
    console.log(`  vs "${d.org2.organization_name}" [${d.org2.id}] (${d.org2.criteria_count} crit, created ${d.org2.created_at?.toISOString().slice(0,10)})`);
    console.log(`  Domain: ${d.domain} | Shared Criteria: ${d.sharedCriteriaCount}`);
  }

  await sql.end();
}

run();
