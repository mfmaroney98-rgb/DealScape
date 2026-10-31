import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

function cleanSuffix(name) {
  if (!name) return name;
  let s = name.trim();

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

async function runCleanup(dryRun = false) {
  console.log(`Starting full organization legal suffix cleanup (DryRun: ${dryRun})...\n`);

  // 1. Fetch all organizations
  const orgs = await sql`SELECT * FROM organizations ORDER BY organization_name ASC;`;
  console.log(`Loaded ${orgs.length} organizations from database.`);

  // 2. Fetch all buyer criteria
  const criteria = await sql`SELECT id, organization_id, organization_name, investment_criteria_name FROM buyer_criteria;`;
  console.log(`Loaded ${criteria.length} buyer criteria from database.`);

  // Backup
  if (!dryRun) {
    fs.writeFileSync('scratch/backup_full_suffix_cleanup.json', JSON.stringify({ orgs, criteria }, null, 2));
    console.log('Full backup saved to scratch/backup_full_suffix_cleanup.json');
  }

  // Check collision clusters
  const cleanToOrgs = new Map();
  for (const o of orgs) {
    const cleaned = cleanSuffix(o.organization_name);
    const key = cleaned.toLowerCase();
    if (!cleanToOrgs.has(key)) cleanToOrgs.set(key, []);
    cleanToOrgs.get(key).push({ org: o, cleaned });
  }

  let totalMergedDups = 0;
  let totalNamesUpdated = 0;
  let totalCriteriaUpdated = 0;

  await sql.begin(async sqlTx => {
    // Process collisions first (e.g. CS Capital Partners, Granite Capital Partners)
    for (const [key, group] of cleanToOrgs.entries()) {
      if (group.length > 1) {
        // Sort: prefer one with website or more criteria
        group.sort((a, b) => {
          const aWeb = a.org.website_url ? 1 : 0;
          const bWeb = b.org.website_url ? 1 : 0;
          if (bWeb !== aWeb) return bWeb - aWeb;
          return new Date(a.org.created_at) - new Date(b.org.created_at);
        });

        const primary = group[0];
        const duplicates = group.slice(1);

        console.log(`[COLLISION MERGE] Resolving collision for "${primary.cleaned}":`);
        console.log(`  Keeping Primary ID: ${primary.org.id} ("${primary.org.organization_name}")`);

        // Update primary name
        if (!dryRun) {
          await sqlTx`
            UPDATE organizations
            SET organization_name = ${primary.cleaned}, updated_at = NOW()
            WHERE id = ${primary.org.id};
          `;
        }

        for (const dup of duplicates) {
          console.log(`  Merging & Deleting Dup ID: ${dup.org.id} ("${dup.org.organization_name}")`);
          if (!dryRun) {
            // Re-point criteria
            await sqlTx`
              UPDATE buyer_criteria
              SET organization_id = ${primary.org.id},
                  organization_name = ${primary.cleaned},
                  updated_at = NOW()
              WHERE organization_id = ${dup.org.id};
            `;
            // Re-point user profiles and seller listings
            await sqlTx`
              UPDATE user_profiles
              SET organization_id = ${primary.org.id}
              WHERE organization_id = ${dup.org.id};
            `;
            await sqlTx`
              UPDATE seller_listings
              SET organization_id = ${primary.org.id}
              WHERE organization_id = ${dup.org.id};
            `;
            // Delete duplicate organization
            await sqlTx`DELETE FROM organizations WHERE id = ${dup.org.id};`;
          }
          totalMergedDups++;
        }
      } else {
        // Single organization
        const { org, cleaned } = group[0];
        if (cleaned !== org.organization_name) {
          if (!dryRun) {
            await sqlTx`
              UPDATE organizations
              SET organization_name = ${cleaned}, updated_at = NOW()
              WHERE id = ${org.id};
            `;
          }
          totalNamesUpdated++;
        }
      }
    }

    // Now update all buyer_criteria organization_name and clean investment_criteria_name prefixes
    console.log('\nUpdating buyer_criteria names and titles...');
    const critByOrgId = new Map();
    for (const c of criteria) {
      if (!critByOrgId.has(c.organization_id)) critByOrgId.set(c.organization_id, []);
      critByOrgId.get(c.organization_id).push(c);
    }

    for (const org of orgs) {
      const cleaned = cleanSuffix(org.organization_name);
      const orgCriteria = critByOrgId.get(org.id) || [];

      for (const c of orgCriteria) {
        let updatedCritName = c.investment_criteria_name;
        // If criteria name starts with old name or has " - "
        if (updatedCritName) {
          if (updatedCritName.includes(' - ')) {
            const parts = updatedCritName.split(' - ');
            // If the first part resembles the company name with suffix, replace with cleaned name
            const firstPart = parts[0].trim();
            if (cleanSuffix(firstPart).toLowerCase() === cleaned.toLowerCase()) {
              updatedCritName = `${cleaned} - ${parts.slice(1).join(' - ').trim()}`;
            }
          } else if (cleanSuffix(updatedCritName).toLowerCase() === cleaned.toLowerCase()) {
            updatedCritName = cleaned;
          }
        }

        if (c.organization_name !== cleaned || (updatedCritName && updatedCritName !== c.investment_criteria_name)) {
          if (!dryRun) {
            await sqlTx`
              UPDATE buyer_criteria
              SET organization_name = ${cleaned},
                  investment_criteria_name = ${updatedCritName || cleaned},
                  updated_at = NOW()
              WHERE id = ${c.id};
            `;
          }
          totalCriteriaUpdated++;
        }
      }
    }

    if (dryRun) {
      console.log('\n[DRY RUN COMPLETE] - Transaction will be rolled back.');
      throw new Error('Dry run rollback');
    }
  });

  console.log(`\n=================== SUFFIX CLEANUP COMPLETE ===================`);
  console.log(`Organizations with Suffixes Cleaned: ${totalNamesUpdated}`);
  console.log(`Collision Duplicates Merged & Removed: ${totalMergedDups}`);
  console.log(`Buyer Criteria Records Synced/Cleaned: ${totalCriteriaUpdated}`);
}

const shouldExecute = process.argv.includes('--run');
runCleanup(!shouldExecute)
  .then(async () => {
    await sql.end();
  })
  .catch(async err => {
    if (err.message !== 'Dry run rollback') {
      console.error('Error during cleanup:', err);
    }
    await sql.end();
  });
