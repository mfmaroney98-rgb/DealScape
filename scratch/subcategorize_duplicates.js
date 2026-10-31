import fs from 'fs';

const clusters = JSON.parse(fs.readFileSync('scratch/high_confidence_clusters.json', 'utf8'));

// Look for Align
const alignCluster = clusters.find(c => c.orgs.some(o => o.name.toLowerCase().includes('align capital')));
console.log('Align Capital Partners Cluster:');
console.log(JSON.stringify(alignCluster, null, 2));

// Break down high-confidence duplicates by exact subtype:
// 1. Identical normalized domain AND practically identical name (e.g. "Align Capital Partners" vs "Align Capital Partners, LP")
// 2. Exact same base name (ignoring LLC, Inc, LP, etc.)
// 3. Same domain, different division / vehicle (e.g. Morgan Stanley teams, TPG platforms)
const exactNameSameEntity = [];
const sameDomainSameEntity = [];
const sameFirmDifferentVehicle = [];

for (const c of clusters) {
  // Let's check pairwise within cluster
  for (let i = 0; i < c.orgs.length; i++) {
    for (let j = i + 1; j < c.orgs.length; j++) {
      const o1 = c.orgs[i];
      const o2 = c.orgs[j];
      
      const clean1 = o1.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const clean2 = o2.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // strip suffixes
      const stripSuffix = (s) => s.toLowerCase()
        .replace(/\b(llc|l\.l\.c\.|inc|incorporated|corp|corporation|co|company|lp|l\.p\.|llp|ltd|limited|plc|partners|partner|capital|equity|management|investments|investment|holdings|holding|group)\b/g, '')
        .replace(/[^a-z0-9]/g, '');

      const base1 = stripSuffix(o1.name);
      const base2 = stripSuffix(o2.name);

      // check domains
      const dom1 = o1.website ? o1.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : null;
      const dom2 = o2.website ? o2.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : null;
      const sameDomain = (dom1 && dom2 && dom1 === dom2);

      // if names only differ by legal suffix like ", LP" or ", LLC"
      const simple1 = o1.name.toLowerCase().replace(/,\s*(lp|llc|inc|co|l\.p\.|l\.l\.c\.|ltd)\.?$/gi, '').trim();
      const simple2 = o2.name.toLowerCase().replace(/,\s*(lp|llc|inc|co|l\.p\.|l\.l\.c\.|ltd)\.?$/gi, '').trim();

      if (simple1 === simple2 || clean1 === clean2) {
        exactNameSameEntity.push({ o1, o2, type: 'Legal Suffix / Punctuation Variation', dom1, dom2 });
      } else if (sameDomain && (base1 === base2 || clean1.includes(clean2) || clean2.includes(clean1))) {
        sameDomainSameEntity.push({ o1, o2, type: 'Same Domain & High Name Overlap', dom1, dom2 });
      } else if (sameDomain) {
        sameFirmDifferentVehicle.push({ o1, o2, type: 'Same Domain (Possible Sub-units / Divisions)', dom1, dom2 });
      }
    }
  }
}

console.log(`\nExact Name / Legal Suffix Variations: ${exactNameSameEntity.length} pairs`);
console.log(`Same Domain & High Name Overlap: ${sameDomainSameEntity.length} pairs`);
console.log(`Same Domain Different Vehicle/Team: ${sameFirmDifferentVehicle.length} pairs`);

fs.writeFileSync('scratch/exact_name_duplicates.json', JSON.stringify(exactNameSameEntity, null, 2));
fs.writeFileSync('scratch/same_domain_duplicates.json', JSON.stringify(sameDomainSameEntity, null, 2));
