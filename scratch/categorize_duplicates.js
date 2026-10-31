import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/duplicates_report.json', 'utf8'));

console.log(`Total candidate pairs: ${data.length}`);

// Find Align Capital Partners specifically
const align = data.filter(d => 
  d.org1.organization_name.toLowerCase().includes('align') || 
  d.org2.organization_name.toLowerCase().includes('align')
);
console.log('\n--- Align Capital Partners Matches ---');
console.log(JSON.stringify(align, null, 2));

// Categorize into:
// Category 1: Extremely High Confidence (Same Domain or Exact Base Name Match)
const highConfidence = [];
const mediumConfidence = [];
const potentialFalsePositives = [];

for (const pair of data) {
  const hasSameDomain = pair.reasons.some(r => r.startsWith('Matching Domain:'));
  const hasExactBaseName = pair.reasons.some(r => r.startsWith('Same Base Name:') || r === 'Exact normalized name match' || r === 'Identical alphanumeric characters');
  
  if (hasSameDomain || hasExactBaseName) {
    highConfidence.push(pair);
  } else if (pair.reasons.some(r => r.includes('similarity (9') || r.includes('similarity (8') || r.includes('word overlap'))) {
    mediumConfidence.push(pair);
  } else {
    potentialFalsePositives.push(pair);
  }
}

console.log(`\nHigh Confidence Pairs: ${highConfidence.length}`);
console.log(`Medium Confidence Pairs: ${mediumConfidence.length}`);
console.log(`Other/Potential False Positives: ${potentialFalsePositives.length}`);

fs.writeFileSync('scratch/high_confidence_duplicates.json', JSON.stringify(highConfidence, null, 2));
fs.writeFileSync('scratch/medium_confidence_duplicates.json', JSON.stringify(mediumConfidence, null, 2));
