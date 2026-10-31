import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

// Explicit verified branding dictionary for duplicate clusters
const BRAND_OVERRIDES = {
  '1315 Capital': '1315 Capital',
  '154 Partners Investment Management': '154 Partners',
  '1kx Management': '1kx',
  '26North Partners': '26North',
  '3 Boomerang Capital': '3 Boomerang Capital',
  '3 Rivers Capital': '3 Rivers Capital',
  '424 Capital': '424 Capital',
  '4x4 Capital': '4x4 Capital',
  '57 Stars': '57 Stars',
  'Accel-KKR': 'Accel-KKR',
  'Acceleration Resources': 'Acceleration Resources',
  'Access Holdings': 'Access Holdings',
  'Affinius Capital': 'Affinius Capital',
  'Agility Equity Partners': 'Agility Equity Partners',
  'Align Capital Partners': 'Align Capital Partners',
  'BayPine': 'BayPine',
  'Baypine Holdings LP': 'BayPine',
  'Blue Point Capital Partners': 'Blue Point Capital Partners',
  'Brixey & Meyer Capital': 'Brixey & Meyer Capital',
  'Brown Advisory': 'Brown Advisory',
  'Continuim Equity Partners': 'Continuim Equity Partners',
  'Council capital': 'Council Capital',
  'Council Capital': 'Council Capital',
  'Crescent Real Estate': 'Crescent Real Estate',
  "D'Orazio Capital Partners": "D'Orazio Capital Partners",
  'Edgewater Capital Partners': 'Edgewater Capital Partners',
  'Elevar Equity': 'Elevar Equity',
  'Eltura Capital Partners': 'Eltura Capital Partners',
  'Enhanced Capital Partners': 'Enhanced Capital Partners',
  'Enhanced Healthcare Partners': 'Enhanced Healthcare Partners',
  'FIC': 'FIC Partners',
  'Forest Road': 'The Forest Road Company',
  'GCP Capital Partners': 'GCP Capital Partners',
  'Gen Cap America': 'Gen Cap America',
  'GenNx360 Capital Partners': 'GenNx360 Capital Partners',
  'Genstar Capital': 'Genstar Capital',
  'GPI Capital': 'GPI Capital',
  'Invictus Capital Partners': 'Invictus Capital Partners',
  'Kennedy Lewis Management': 'Kennedy Lewis Investment Management',
  'Kinzie Capital Partners': 'Kinzie Capital Partners',
  'LFM Capital': 'LFM Capital',
  'Lime Rock Partners': 'Lime Rock Partners',
  'Middlefield Limited': 'Middlefield Group',
  'Middlefield Venture Group': 'Middlefield Group',
  'Morgan Stanley Private Equity': 'Morgan Stanley Private Equity',
  'New Harbor Capital': 'New Harbor Capital',
  'Petra Capital Partners': 'Petra Capital Partners',
  'PPM America': 'PPM America',
  'Primus Capital': 'Primus Capital',
  'RCP': 'RCP Advisors',
  'Resilience Capital Partners': 'Resilience Capital Partners',
  'Seidler Kutsenda Management Company LLC': 'Seidler Equity Partners',
  'Seidler Kutsenda Management Company, LLC': 'Seidler Equity Partners',
  'Shore Capital Partners': 'Shore Capital Partners',
  'Soleus Capital': 'Soleus Capital',
  'Stonehenge Partners': 'Stonehenge Partners',
  'Svoboda Capital Partners': 'Svoboda Capital Partners',
  'TCG Capital Management': 'TCG',
  'Tecum Capital': 'Tecum Capital',
  'Wellington': 'Wellington Management',
  'Whistler Capital Partners': 'Whistler Capital Partners',
  'Woodside Capital Partners': 'Woodside Capital Partners'
};

function getBrandedName(names) {
  for (const n of names) {
    if (BRAND_OVERRIDES[n]) return BRAND_OVERRIDES[n];
  }

  // Fallback heuristic
  const candidates = names.map(orig => {
    let clean = orig.trim();
    clean = clean.replace(/,\s*(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc)\.?$/gi, '');
    clean = clean.replace(/\s+(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc)\.?$/gi, '');
    clean = clean.replace(/\s+management\s+company\s*$/gi, '');
    clean = clean.replace(/,\s*lp$/gi, '');
    clean = clean.replace(/\s+advisors\s*$/gi, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    // Capitalize properly
    clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { orig, clean };
  });

  for (const c of candidates) {
    if (BRAND_OVERRIDES[c.clean]) return BRAND_OVERRIDES[c.clean];
  }
  for (const c of candidates) {
    if (c.clean === c.orig) return c.orig;
  }
  candidates.sort((a, b) => a.clean.length - b.clean.length);
  return candidates[0].clean;
}

function extractCriteriaCore(firmName, criteriaName) {
  if (!criteriaName) return '';
  let clean = criteriaName.trim();
  if (clean.includes(' - ')) {
    clean = clean.split(' - ').slice(1).join(' - ');
  } else if (clean.includes(': ')) {
    clean = clean.split(': ').slice(1).join(': ');
  }
  clean = clean.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
}

async function executeMerge(dryRun = false) {
  console.log(`Starting duplicate organizations merge (DryRun: ${dryRun})...\n`);

  const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed_duplicates.json', 'utf8'));
  const highlyLikely = JSON.parse(fs.readFileSync('scratch/highly_likely_duplicates.json', 'utf8'));

  const allPairs = [...confirmed, ...highlyLikely];
  const validPairs = [];

  for (const p of allPairs) {
    const n1 = p.org1.organization_name;
    const n2 = p.org2.organization_name;

    // Exclude distinct divisions
    if (p.domain === 'morganstanley.com' && (n1.includes('Infrastructure') || n2.includes('Infrastructure') || n1.includes('Real Estate') || n2.includes('Real Estate'))) {
      continue;
    }
    if (p.domain === 'tpg.com' && (n1.includes('Real Estate') || n2.includes('Real Estate'))) {
      continue;
    }
    validPairs.push(p);
  }

  // Build clusters
  const adj = new Map();
  const orgMap = new Map();

  for (const p of validPairs) {
    if (!adj.has(p.org1.id)) adj.set(p.org1.id, []);
    if (!adj.has(p.org2.id)) adj.set(p.org2.id, []);
    adj.get(p.org1.id).push(p.org2.id);
    adj.get(p.org2.id).push(p.org1.id);
    orgMap.set(p.org1.id, p.org1);
    orgMap.set(p.org2.id, p.org2);
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

  console.log(`Found ${clusters.length} duplicate clusters.`);

  // Load all criteria and orgs from DB
  const allOrgIds = clusters.flatMap(c => c.map(o => o.id));
  const dbOrgs = await sql`SELECT * FROM organizations WHERE id IN ${sql(allOrgIds)}`;
  const dbCriteria = await sql`SELECT * FROM buyer_criteria WHERE organization_id IN ${sql(allOrgIds)}`;

  fs.writeFileSync('scratch/backup_orgs_and_criteria.json', JSON.stringify({ orgs: dbOrgs, criteria: dbCriteria }, null, 2));
  console.log(`Backup saved to scratch/backup_orgs_and_criteria.json.`);

  const dbOrgMap = new Map(dbOrgs.map(o => [o.id, o]));
  const critByOrg = new Map();
  for (const c of dbCriteria) {
    if (!critByOrg.has(c.organization_id)) critByOrg.set(c.organization_id, []);
    critByOrg.get(c.organization_id).push(c);
  }

  let totalDupsRemoved = 0;
  let totalCriteriaDeleted = 0;
  let totalCriteriaTransferred = 0;
  let totalCanonicalUpdated = 0;

  await sql.begin(async sqlTx => {
    for (const cluster of clusters) {
      cluster.sort((a, b) => {
        if (b.profiles !== a.profiles) return b.profiles - a.profiles;
        if (b.criteria_count !== a.criteria_count) return b.criteria_count - a.criteria_count;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      const primaryOrg = dbOrgMap.get(cluster[0].id);
      const duplicateOrgs = cluster.slice(1).map(d => dbOrgMap.get(d.id));

      const brandedName = getBrandedName(cluster.map(o => o.organization_name));

      // 1. Backfill any missing fields on primaryOrg from duplicates
      const updates = { organization_name: brandedName };
      for (const dup of duplicateOrgs) {
        if (!primaryOrg.website_url && dup.website_url) updates.website_url = dup.website_url;
        if (!primaryOrg.headquarters && dup.headquarters) updates.headquarters = dup.headquarters;
        if (!primaryOrg.overview_document_url && dup.overview_document_url) {
          updates.overview_document_url = dup.overview_document_url;
          updates.overview_file_name = dup.overview_file_name;
        }
        if (!primaryOrg.buyer_type && dup.buyer_type) updates.buyer_type = dup.buyer_type;
        if (!primaryOrg.organization_summary && dup.organization_summary) updates.organization_summary = dup.organization_summary;
      }

      console.log(`[MERGE] "${primaryOrg.organization_name}" -> Branded: "${brandedName}" (ID: ${primaryOrg.id})`);
      if (!dryRun) {
        await sqlTx`
          UPDATE organizations
          SET ${sqlTx(updates)}, updated_at = NOW()
          WHERE id = ${primaryOrg.id};
        `;
      }
      totalCanonicalUpdated++;

      // 2. Check criteria
      const pCrit = critByOrg.get(primaryOrg.id) || [];

      for (const dup of duplicateOrgs) {
        const dCrit = critByOrg.get(dup.id) || [];

        for (const dc of dCrit) {
          const dCore = extractCriteriaCore(dup.organization_name, dc.investment_criteria_name);
          const match = pCrit.find(pc => {
            const pCore = extractCriteriaCore(brandedName, pc.investment_criteria_name);
            return dCore && pCore && (dCore === pCore || dCore.includes(pCore) || pCore.includes(dCore));
          });

          if (match) {
            console.log(`  - Deleting duplicate criteria: "${dc.investment_criteria_name}" [${dc.id}]`);
            if (!dryRun) {
              await sqlTx`DELETE FROM buyer_criteria WHERE id = ${dc.id};`;
            }
            totalCriteriaDeleted++;
          } else {
            let newCritName = dc.investment_criteria_name;
            if (newCritName && newCritName.includes(' - ')) {
              const sub = newCritName.split(' - ').slice(1).join(' - ');
              newCritName = `${brandedName} - ${sub}`;
            }
            console.log(`  - Transferring unique criteria: "${dc.investment_criteria_name}" -> "${newCritName}" [${dc.id}]`);
            if (!dryRun) {
              await sqlTx`
                UPDATE buyer_criteria
                SET organization_id = ${primaryOrg.id},
                    organization_name = ${brandedName},
                    investment_criteria_name = ${newCritName},
                    updated_at = NOW()
                WHERE id = ${dc.id};
              `;
            }
            pCrit.push({ ...dc, investment_criteria_name: newCritName });
            totalCriteriaTransferred++;
          }
        }

        // Re-point any user profiles or seller listings if they exist
        if (!dryRun) {
          await sqlTx`
            UPDATE user_profiles
            SET organization_id = ${primaryOrg.id}
            WHERE organization_id = ${dup.id};
          `;
          await sqlTx`
            UPDATE seller_listings
            SET organization_id = ${primaryOrg.id}
            WHERE organization_id = ${dup.id};
          `;
          await sqlTx`DELETE FROM organizations WHERE id = ${dup.id};`;
        }
        console.log(`  - Deleted duplicate org: "${dup.organization_name}" [${dup.id}]`);
        totalDupsRemoved++;
      }

      // Rename primary criteria to use the branded name
      if (!dryRun) {
        for (const pc of pCrit) {
          let updatedName = pc.investment_criteria_name;
          if (updatedName && updatedName.includes(' - ')) {
            const sub = updatedName.split(' - ').slice(1).join(' - ');
            updatedName = `${brandedName} - ${sub}`;
          }
          await sqlTx`
            UPDATE buyer_criteria
            SET organization_name = ${brandedName},
                investment_criteria_name = ${updatedName},
                updated_at = NOW()
            WHERE id = ${pc.id};
          `;
        }
      }
    }

    if (dryRun) {
      console.log('\n[DRY RUN COMPLETE] - Transaction rolled back.');
      throw new Error('Dry run rollback');
    }
  });

  console.log(`\n=================== MERGE COMPLETE ===================`);
  console.log(`Total Canonical Organizations Updated to Branded Names: ${totalCanonicalUpdated}`);
  console.log(`Total Duplicate Organizations Removed: ${totalDupsRemoved}`);
  console.log(`Total Duplicate Criteria Deleted: ${totalCriteriaDeleted}`);
  console.log(`Total Unique Criteria Transferred: ${totalCriteriaTransferred}`);
}

const shouldExecute = process.argv.includes('--run');
executeMerge(!shouldExecute)
  .then(async () => {
    await sql.end();
  })
  .catch(async err => {
    if (err.message !== 'Dry run rollback') {
      console.error('Merge error:', err);
    }
    await sql.end();
  });
