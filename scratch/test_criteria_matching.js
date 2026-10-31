import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

// Function to extract core criteria topic
function extractCriteriaCore(firmName, criteriaName) {
  if (!criteriaName) return '';
  let clean = criteriaName.trim();
  // If format is "Firm Name - Subtitle"
  if (clean.includes(' - ')) {
    clean = clean.split(' - ').slice(1).join(' - ');
  } else if (clean.includes(': ')) {
    clean = clean.split(': ').slice(1).join(': ');
  }
  // Strip legal suffixes & punctuation
  clean = clean.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
}

async function testMatching() {
  const plans = JSON.parse(fs.readFileSync('scratch/detailed_merge_plan.json', 'utf8'));
  const allOrgIds = plans.flatMap(p => [p.primaryOrgId, ...p.duplicateOrgIds.map(d => d.id)]);

  const criteria = await sql`
    SELECT id, organization_id, organization_name, investment_criteria_name, created_at
    FROM buyer_criteria
    WHERE organization_id IN ${sql(allOrgIds)}
    ORDER BY created_at ASC;
  `;

  const critByOrg = new Map();
  for (const c of criteria) {
    if (!critByOrg.has(c.organization_id)) critByOrg.set(c.organization_id, []);
    critByOrg.get(c.organization_id).push(c);
  }

  let totalDuplicateCriteriaPairs = 0;
  const duplicatePairs = [];

  for (const plan of plans) {
    const pCrit = critByOrg.get(plan.primaryOrgId) || [];
    for (const dup of plan.duplicateOrgIds) {
      const dCrit = critByOrg.get(dup.id) || [];
      for (const dc of dCrit) {
        const dCore = extractCriteriaCore(dup.name, dc.investment_criteria_name);
        const match = pCrit.find(pc => {
          const pCore = extractCriteriaCore(plan.brandedName, pc.investment_criteria_name);
          return dCore && pCore && (dCore === pCore || dCore.includes(pCore) || pCore.includes(dCore));
        });

        if (match) {
          totalDuplicateCriteriaPairs++;
          duplicatePairs.push({
            brandedName: plan.brandedName,
            primaryCriteria: { id: match.id, name: match.investment_criteria_name, created: match.created_at },
            duplicateCriteria: { id: dc.id, name: dc.investment_criteria_name, created: dc.created_at }
          });
        }
      }
    }
  }

  console.log(`Found ${totalDuplicateCriteriaPairs} duplicate criteria pairs across the ${plans.length} duplicate organizations.`);
  fs.writeFileSync('scratch/duplicate_criteria_pairs.json', JSON.stringify(duplicatePairs, null, 2));

  for (const dp of duplicatePairs) {
    console.log(`[${dp.brandedName}]`);
    console.log(`  Keep: "${dp.primaryCriteria.name}" (${dp.primaryCriteria.id})`);
    console.log(`  Dup:  "${dp.duplicateCriteria.name}" (${dp.duplicateCriteria.id})`);
  }

  await sql.end();
}

testMatching();
