import fs from 'fs';

const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed_duplicates.json', 'utf8'));

console.log('=== ALL 29 CONFIRMED DUPLICATES ===');
confirmed.forEach((c, i) => {
  console.log(`${i + 1}. [${c.domain || 'no domain'}]`);
  console.log(`   Org A: "${c.org1.organization_name}" (ID: ${c.org1.id}) | Criteria: ${c.org1.criteria_count} | Profiles: ${c.org1.profiles} | Created: ${c.org1.created_at.slice(0, 10)}`);
  console.log(`   Org B: "${c.org2.organization_name}" (ID: ${c.org2.id}) | Criteria: ${c.org2.criteria_count} | Profiles: ${c.org2.profiles} | Created: ${c.org2.created_at.slice(0, 10)}`);
});
