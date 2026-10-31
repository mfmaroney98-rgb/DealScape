import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

// Function to normalize domain from URL
function extractDomain(url) {
  if (!url) return null;
  try {
    let clean = url.trim().toLowerCase();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    // fallback regex
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();
  }
}

// Function to normalize company names
function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  
  // Replace & with and
  n = n.replace(/&/g, ' and ');
  
  // Remove punctuation
  n = n.replace(/[.,\/#!$%\^*;:{}=\-_`~()'"?]/g, ' ');
  
  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();
  
  // Strip legal and common financial entity suffixes
  const stopWords = [
    'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company',
    'lp', 'l p', 'llp', 'l l c', 'ltd', 'limited', 'plc',
    'partners', 'partner', 'capital', 'equity', 'management', 'investments', 'investment',
    'holdings', 'holding', 'group', 'advisors', 'fund', 'funds', 'enterprises', 'ventures'
  ];
  
  let words = n.split(' ');
  // Filter out trailing stopwords
  while (words.length > 1 && stopWords.includes(words[words.length - 1])) {
    words.pop();
  }
  
  return words.join(' ');
}

// Full simplification for aggressive matching
function aggressiveSimplify(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Levenshtein distance
function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let j = 0; j <= bn; ++j) matrix[j][0] = j;
  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1.0;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(al, bl);
  return 1 - dist / maxLen;
}

// Token Jaccard similarity
function jaccardSimilarity(a, b) {
  const getTokens = str => new Set(str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const tA = getTokens(a);
  const tB = getTokens(b);
  if (tA.size === 0 && tB.size === 0) return 1.0;
  if (tA.size === 0 || tB.size === 0) return 0.0;
  const intersection = new Set([...tA].filter(x => tB.has(x)));
  const union = new Set([...tA, ...tB]);
  return intersection.size / union.size;
}

async function analyzeDuplicates() {
  try {
    const orgs = await sql`
      SELECT 
        o.id,
        o.organization_name,
        o.type,
        o.buyer_type,
        o.website_url,
        o.headquarters,
        o.created_at,
        (SELECT count(*) FROM user_profiles up WHERE up.organization_id = o.id) AS profile_count,
        (SELECT count(*) FROM buyer_criteria bc WHERE bc.organization_id = o.id) AS criteria_count,
        (SELECT count(*) FROM seller_listings sl WHERE sl.organization_id = o.id) AS listing_count
      FROM organizations o
      ORDER BY o.organization_name ASC;
    `;

    console.log(`Fetched ${orgs.length} organizations.`);

    const domainMap = new Map();
    const normalizedNameMap = new Map();
    const candidatePairs = new Map(); // key: id1_id2, value: match details

    for (const org of orgs) {
      const dom = extractDomain(org.website_url);
      if (dom && dom !== 'linkedin.com' && !dom.includes('example.com') && dom.length > 3) {
        if (!domainMap.has(dom)) domainMap.set(dom, []);
        domainMap.get(dom).push(org);
      }

      const norm = normalizeName(org.organization_name);
      if (norm) {
        if (!normalizedNameMap.has(norm)) normalizedNameMap.set(norm, []);
        normalizedNameMap.get(norm).push(org);
      }
    }

    // 1. Same normalized domain
    for (const [dom, list] of domainMap.entries()) {
      if (list.length > 1) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const pairKey = [list[i].id, list[j].id].sort().join('__');
            if (!candidatePairs.has(pairKey)) {
              candidatePairs.set(pairKey, {
                org1: list[i],
                org2: list[j],
                reasons: []
              });
            }
            candidatePairs.get(pairKey).reasons.push(`Matching Domain: ${dom}`);
          }
        }
      }
    }

    // 2. Same normalized name (stripped suffixes)
    for (const [norm, list] of normalizedNameMap.entries()) {
      if (list.length > 1) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const pairKey = [list[i].id, list[j].id].sort().join('__');
            if (!candidatePairs.has(pairKey)) {
              candidatePairs.set(pairKey, {
                org1: list[i],
                org2: list[j],
                reasons: []
              });
            }
            candidatePairs.get(pairKey).reasons.push(`Same Base Name: "${norm}"`);
          }
        }
      }
    }

    // 3. Pairwise fuzzy and substring checks
    for (let i = 0; i < orgs.length; i++) {
      const o1 = orgs[i];
      const name1 = (o1.organization_name || '').toLowerCase().trim();
      const norm1 = normalizeName(name1);
      const agg1 = aggressiveSimplify(name1);

      for (let j = i + 1; j < orgs.length; j++) {
        const o2 = orgs[j];
        const name2 = (o2.organization_name || '').toLowerCase().trim();
        const norm2 = normalizeName(name2);
        const agg2 = aggressiveSimplify(name2);

        const pairKey = [o1.id, o2.id].sort().join('__');
        const existing = candidatePairs.get(pairKey);

        const sim = stringSimilarity(name1, name2);
        const normSim = stringSimilarity(norm1, norm2);
        const jaccard = jaccardSimilarity(name1, name2);

        const reasons = [];

        if (agg1 === agg2 && agg1.length > 3) {
          reasons.push('Identical alphanumeric characters');
        } else if (norm1 && norm2 && (norm1 === norm2)) {
          // already handled by map, but good check
        } else if (norm1.length >= 4 && norm2.length >= 4) {
          if (norm1 === norm2) {
            reasons.push(`Exact normalized name match`);
          } else if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) {
            // e.g. "Align Capital" and "Align Capital Partners"
            reasons.push(`One normalized name is prefix of the other`);
          } else if (normSim >= 0.85) {
            reasons.push(`High normalized similarity (${(normSim * 100).toFixed(1)}%)`);
          } else if (jaccard >= 0.75) {
            reasons.push(`High word overlap / Jaccard (${(jaccard * 100).toFixed(1)}%)`);
          }
        } else if (sim >= 0.88) {
          reasons.push(`High raw similarity (${(sim * 100).toFixed(1)}%)`);
        }

        if (reasons.length > 0) {
          if (!candidatePairs.has(pairKey)) {
            candidatePairs.set(pairKey, {
              org1: o1,
              org2: o2,
              reasons: []
            });
          }
          candidatePairs.get(pairKey).reasons.push(...reasons);
        }
      }
    }

    // De-duplicate reasons
    for (const [key, pair] of candidatePairs.entries()) {
      pair.reasons = [...new Set(pair.reasons)];
    }

    console.log(`\n=================== SUSPECTED DUPLICATES (${candidatePairs.size} pairs found) ===================\n`);

    const results = Array.from(candidatePairs.values());
    // Sort by most compelling reasons or name
    results.sort((a, b) => a.org1.organization_name.localeCompare(b.org1.organization_name));

    fs.writeFileSync('scratch/duplicates_report.json', JSON.stringify(results, null, 2));

    for (const r of results) {
      console.log(`------------------------------------------------------------------------`);
      console.log(`Org 1: "${r.org1.organization_name}" (ID: ${r.org1.id})`);
      console.log(`       Type: ${r.org1.type} / BuyerType: ${r.org1.buyer_type} | Website: ${r.org1.website_url || 'N/A'}`);
      console.log(`       Data: ${r.org1.profile_count} profiles, ${r.org1.criteria_count} buyer criteria, ${r.org1.listing_count} seller listings`);
      console.log(`Org 2: "${r.org2.organization_name}" (ID: ${r.org2.id})`);
      console.log(`       Type: ${r.org2.type} / BuyerType: ${r.org2.buyer_type} | Website: ${r.org2.website_url || 'N/A'}`);
      console.log(`       Data: ${r.org2.profile_count} profiles, ${r.org2.criteria_count} buyer criteria, ${r.org2.listing_count} seller listings`);
      console.log(`Reasons: ${r.reasons.join('; ')}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

analyzeDuplicates();
