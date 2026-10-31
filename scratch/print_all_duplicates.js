import fs from 'fs';

const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed_duplicates.json', 'utf8'));
const highlyLikely = JSON.parse(fs.readFileSync('scratch/highly_likely_duplicates.json', 'utf8'));

console.log('=== CONFIRMED DUPLICATES (TOTAL: ' + confirmed.length + ') ===');
confirmed.forEach((c, i) => {
  console.log(`${i + 1}. [${c.domain || 'no domain'}]`);
  console.log(`   A: "${c.org1.organization_name}" (ID: ${c.org1.id}, Criteria: ${c.org1.criteria_count}, Profiles: ${c.org1.profiles}, Created: ${c.org1.created_at.slice(0, 10)})`);
  console.log(`   B: "${c.org2.organization_name}" (ID: ${c.org2.id}, Criteria: ${c.org2.criteria_count}, Profiles: ${c.org2.profiles}, Created: ${c.org2.created_at.slice(0, 10)})`);
});

console.log('\n=== HIGHLY LIKELY DUPLICATES (SAME DOMAIN & RELATED NAME) (TOTAL: ' + highlyLikely.length + ') ===');
highlyLikely.forEach((c, i) => {
  console.log(`${i + 1}. [${c.domain || 'no domain'}]`);
  console.log(`   A: "${c.org1.organization_name}" (ID: ${c.org1.id}, Criteria: ${c.org1.criteria_count}, Profiles: ${c.org1.profiles}, Created: ${c.org1.created_at.slice(0, 10)})`);
  console.log(`   B: "${c.org2.organization_name}" (ID: ${c.org2.id}, Criteria: ${c.org2.criteria_count}, Profiles: ${c.org2.profiles}, Created: ${c.org2.created_at.slice(0, 10)})`);
});
