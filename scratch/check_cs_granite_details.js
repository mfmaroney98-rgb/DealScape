import fs from 'fs';

const backup = JSON.parse(fs.readFileSync('scratch/backup_full_suffix_cleanup.json', 'utf8'));

const csIds = ['f301553e-6f5b-428a-b464-07b54957a975', 'e7280de0-2385-47ca-a975-35f86f352f02'];
const graniteIds = ['7dbfab89-b31a-4868-aa55-da6fb20c2643', 'aa5b7488-3652-459b-abd9-112872e82145'];

const csOrgs = backup.orgs.filter(o => csIds.includes(o.id));
const graniteOrgs = backup.orgs.filter(o => graniteIds.includes(o.id));

console.log('=== CS Capital Partners Original Records ===');
console.log(JSON.stringify(csOrgs, null, 2));

console.log('\n=== Granite Capital Partners Original Records ===');
console.log(JSON.stringify(graniteOrgs, null, 2));
