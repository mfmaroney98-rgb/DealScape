import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

function cleanDomain(url) {
  if (!url) return '';
  return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();
}

// Determines the branded name:
// Removes legal entity suffixes like LLC, LP, Inc, Corp, Management Company, etc.
// Chooses proper Title Casing
function getBrandedName(names) {
  // Sort names prioritizing shorter, cleaner names without legal suffixes
  const candidates = names.map(orig => {
    let clean = orig.trim();
    // Replace commas before legal suffixes
    clean = clean.replace(/,\s*(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc)\.?$/gi, '');
    clean = clean.replace(/\s+(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc)\.?$/gi, '');
    clean = clean.replace(/\s+management\s+company\s*$/gi, '');
    clean = clean.replace(/\s+advisors\s*$/gi, '');
    // clean multiple spaces
    clean = clean.replace(/\s+/g, ' ').trim();
    return { orig, clean };
  });

  // Pick the cleanest name
  // If one of the original names is already very clean (e.g. "Align Capital Partners"), use it
  for (const c of candidates) {
    if (c.clean === c.orig) return c.orig;
  }
  // Otherwise pick the shortest clean name with proper casing
  candidates.sort((a, b) => a.clean.length - b.clean.length);
  return candidates[0].clean;
}

async function prepareMergePlan() {
  const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed_duplicates.json', 'utf8'));
  const highlyLikely = JSON.parse(fs.readFileSync('scratch/highly_likely_duplicates.json', 'utf8'));

  // Combine pairs and build connected clusters
  const allPairs = [...confirmed, ...highlyLikely];
  
  // Filter out any false pairs where the domain is generic or different firms
  // e.g. Morgan Stanley teams (Morgan Stanley Private Equity vs Morgan Stanley Infrastructure vs Real Estate Fund)
  // Let's inspect which ones are genuine duplicates of the same firm
  const validPairs = [];
  const excludedPairs = [];

  for (const p of allPairs) {
    const n1 = p.org1.organization_name;
    const n2 = p.org2.organization_name;

    // Morgan Stanley division platforms are distinct investment strategies (Infrastructure, Real Estate, Asia, etc.)
    // Crow Holdings Capital vs Crow Holdings (Crow Holdings is parent)
    // Let's check:
    if (p.domain === 'morganstanley.com' && n1.includes('Infrastructure') || n2.includes('Infrastructure') || n1.includes('Real Estate') || n2.includes('Real Estate')) {
      excludedPairs.push({ p, reason: 'Distinct asset class divisions' });
      continue;
    }
    if (p.domain === 'tpg.com' && (n1.includes('Real Estate') || n2.includes('Real Estate'))) {
      excludedPairs.push({ p, reason: 'Distinct asset class divisions' });
      continue;
    }

    validPairs.push(p);
  }

  // Build clusters from validPairs
  const adj = new Map();
  const orgMap = new Map();

  function addEdge(o1, o2) {
    if (!adj.has(o1.id)) adj.set(o1.id, []);
    if (!adj.has(o2.id)) adj.set(o2.id, []);
    adj.get(o1.id).push(o2.id);
    adj.get(o2.id).push(o1.id);
    orgMap.set(o1.id, o1);
    orgMap.set(o2.id, o2);
  }

  for (const p of validPairs) {
    addEdge(p.org1, p.org2);
  }

  const visited = new Set();
  const clusters = [];

  for (const id of adj.keys()) {
    if (!visited.has(id)) {
      const cluster = [];
      const queue = [id];
      visited.add(id);

      while (queue.length > 0) {
        const curr = queue.shift();
        cluster.push(orgMap.get(curr));
        for (const neighbor of adj.get(curr)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      clusters.push(cluster);
    }
  }

  console.log(`Generated ${clusters.length} duplicate clusters to merge.`);

  // For each cluster:
  // Determine Primary Org:
  // Prefer the one created earliest, or the one with existing user profiles / more criteria
  const mergePlans = [];

  for (const cluster of clusters) {
    // Sort orgs in cluster:
    // 1. Has user_profiles (descending)
    // 2. Criteria count (descending)
    // 3. Created at (ascending)
    cluster.sort((a, b) => {
      if (b.profiles !== a.profiles) return b.profiles - a.profiles;
      if (b.criteria_count !== a.criteria_count) return b.criteria_count - a.criteria_count;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const primaryOrg = cluster[0];
    const duplicateOrgs = cluster.slice(1);

    const allNames = cluster.map(o => o.organization_name);
    const brandedName = getBrandedName(allNames);

    mergePlans.push({
      brandedName,
      primaryOrg,
      duplicateOrgs,
      allNames
    });
  }

  // Now let's analyze the criteria for each merge plan:
  // Fetch all criteria for these orgs
  const allOrgIds = clusters.flatMap(c => c.map(o => o.id));
  const criteriaList = await sql`
    SELECT 
      id, 
      organization_id, 
      organization_name, 
      investment_criteria_name, 
      categorized_keywords,
      financial_criteria,
      naics_codes,
      created_at
    FROM buyer_criteria
    WHERE organization_id IN ${sql(allOrgIds)}
    ORDER BY created_at ASC;
  `;

  const criteriaByOrg = new Map();
  for (const c of criteriaList) {
    if (!criteriaByOrg.has(c.organization_id)) criteriaByOrg.set(c.organization_id, []);
    criteriaByOrg.get(c.organization_id).push(c);
  }

  const detailedPlans = [];

  for (const plan of mergePlans) {
    const primaryCriteria = criteriaByOrg.get(plan.primaryOrg.id) || [];
    const duplicateCriteriaToTransfer = [];
    const duplicateCriteriaToDelete = [];

    // Helper to get normalized signature of criteria
    function criteriaSignature(c) {
      const namePart = (c.investment_criteria_name || '')
        .toLowerCase()
        .replace(/^(align capital partners|shore capital partners|svoboda capital partners|genstar capital|tecum capital|etc)[,\s\w]*-/i, '')
        .replace(/\b(llc|lp|inc)\b/g, '')
        .replace(/[^a-z0-9]/g, '');

      const kw = JSON.stringify(c.categorized_keywords || {});
      const fc = JSON.stringify(c.financial_criteria || {});
      const naics = JSON.stringify(c.naics_codes || []);
      return `${namePart}_${kw}_${fc}_${naics}`;
    }

    const primarySigs = new Set(primaryCriteria.map(criteriaSignature));

    for (const dup of plan.duplicateOrgs) {
      const dCriteria = criteriaByOrg.get(dup.id) || [];
      for (const dc of dCriteria) {
        const sig = criteriaSignature(dc);
        if (primarySigs.has(sig)) {
          // Exact duplicate criteria
          duplicateCriteriaToDelete.push({
            id: dc.id,
            name: dc.investment_criteria_name,
            reason: 'Identical duplicate of criteria already on primary org'
          });
        } else {
          // Unique criteria on duplicate org -> keep and reassign!
          primarySigs.add(sig); // Avoid adding duplicates within the duplicate list itself
          duplicateCriteriaToTransfer.push({
            id: dc.id,
            name: dc.investment_criteria_name
          });
        }
      }
    }

    detailedPlans.push({
      brandedName: plan.brandedName,
      primaryOrgId: plan.primaryOrg.id,
      primaryOrgOriginalName: plan.primaryOrg.organization_name,
      duplicateOrgIds: plan.duplicateOrgs.map(d => ({ id: d.id, name: d.organization_name })),
      duplicateCriteriaToDelete,
      duplicateCriteriaToTransfer
    });
  }

  fs.writeFileSync('scratch/detailed_merge_plan.json', JSON.stringify(detailedPlans, null, 2));

  console.log(`\n=================== DETAILED MERGE PLAN SUMMARY ===================`);
  console.log(`Total Clusters to Merge: ${detailedPlans.length}`);
  
  let totalDupsToDelete = detailedPlans.reduce((sum, p) => sum + p.duplicateOrgIds.length, 0);
  let totalCritToDelete = detailedPlans.reduce((sum, p) => sum + p.duplicateCriteriaToDelete.length, 0);
  let totalCritToTransfer = detailedPlans.reduce((sum, p) => sum + p.duplicateCriteriaToTransfer.length, 0);

  console.log(`Total Duplicate Organizations to Remove: ${totalDupsToDelete}`);
  console.log(`Total Duplicate Criteria to Delete: ${totalCritToDelete}`);
  console.log(`Total Unique Criteria to Transfer: ${totalCritToTransfer}`);

  console.log('\n--- SAMPLE MERGE PLANS (First 10) ---');
  detailedPlans.slice(0, 10).forEach((p, idx) => {
    console.log(`\n${idx + 1}. Branded Name: "${p.brandedName}"`);
    console.log(`   Canonical Org ID: ${p.primaryOrgId} (Was: "${p.primaryOrgOriginalName}")`);
    console.log(`   Duplicates to Remove: ${p.duplicateOrgIds.map(d => `"${d.name}" [${d.id}]`).join(', ')}`);
    console.log(`   Criteria: Delete ${p.duplicateCriteriaToDelete.length} duplicates, Transfer ${p.duplicateCriteriaToTransfer.length} unique`);
  });

  await sql.end();
}

prepareMergePlan().catch(console.error);
