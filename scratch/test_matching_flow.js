import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function runTests() {
  console.log('--- STARTING NAICS HIERARCHICAL MATCHING WATERFALL TESTS ---');
  let failures = 0;

  async function assertNaicsScore(label, buyerCodes, sellerCodes, expectedScore) {
    try {
      const res = await sql`
        SELECT calculate_naics_match_bonus(${buyerCodes}, ${sellerCodes}) as score
      `;
      const actualScore = res[0].score !== null ? parseFloat(res[0].score) : null;
      
      const passed = actualScore === expectedScore;
      if (passed) {
        console.log(`[PASS] ${label}`);
        console.log(`       Buyer: [${buyerCodes}] | Seller: [${sellerCodes}]`);
        console.log(`       Score: ${actualScore} (Expected: ${expectedScore})\n`);
      } else {
        console.error(`[FAIL] ${label}`);
        console.error(`       Buyer: [${buyerCodes}] | Seller: [${sellerCodes}]`);
        console.error(`       Score: ${actualScore} (Expected: ${expectedScore})\n`);
        failures++;
      }
    } catch (err) {
      console.error(`[ERROR] ${label} failed with exception:`, err);
      failures++;
    }
  }

  // Test 1: Same exact 4-digit code
  await assertNaicsScore(
    'Same 4-digit code',
    ['5415'],
    ['5415'],
    100.0
  );

  // Test 2: Seller code is a child of buyer's code (e.g. buyer selected 3-digit, seller is within it)
  await assertNaicsScore(
    'Seller is a child of buyer 3-digit code',
    ['541'],
    ['5415'],
    100.0
  );

  // Test 3: Same 3-digit parent, different 4-digit
  await assertNaicsScore(
    'Same 3-digit parent, different 4-digit subsectors',
    ['5415'],
    ['5416'],
    70.0
  );

  // Test 4: Same 2-digit parent, different 3-digit
  await assertNaicsScore(
    'Same 2-digit parent, different 3-digit subsectors',
    ['5415'],
    ['5431'],
    50.0
  );

  // Test 5: No shared 2-digit parent
  await assertNaicsScore(
    'No shared 2-digit parent (completely different sectors)',
    ['5415'],
    ['3111'],
    0.0
  );

  // Test 6: Graceful null/empty fallback
  await assertNaicsScore(
    'Null buyer codes (fallback)',
    null,
    ['5415'],
    null
  );

  await assertNaicsScore(
    'Null seller codes (fallback)',
    ['5415'],
    null,
    null
  );

  console.log('--- NAICS MATCHING ENGINE TESTS COMPLETE ---');
  if (failures === 0) {
    console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
  }

  // Let's also fetch some sample matches from the RPC to inspect the structure of output columns
  console.log('\n--- VERIFYING RPC COLUMNS IN REAL DATABASE MATCHES ---');
  try {
    // Let's get one buyer criteria to test the RPC
    const criteriaRes = await sql`
      SELECT id, investment_criteria_name, naics_codes FROM buyer_criteria LIMIT 1
    `;
    
    if (criteriaRes.length > 0) {
      const crit = criteriaRes[0];
      console.log(`Invoking matching RPC for Criteria ID: ${crit.id} ("${crit.investment_criteria_name}")`);
      console.log(`Buyer NAICS Codes: [${crit.naics_codes || 'None'}]`);

      const matches = await sql`
        SELECT 
          listing_id, 
          seller_anon_name, 
          industry_score, 
          semantic_score, 
          industry_fit_score, 
          total_score
        FROM match_listings_for_criteria(${crit.id})
        LIMIT 3
      `;

      if (matches.length > 0) {
        console.log(`Found ${matches.length} matches:`);
        matches.forEach((m, i) => {
          console.log(`  Match #${i + 1}: ${m.seller_anon_name}`);
          console.log(`    - Industry Score (NAICS): ${m.industry_score ?? 'NULL (Falls back)'}`);
          console.log(`    - Semantic Score (Vector): ${m.semantic_score}`);
          console.log(`    - Blended Industry Fit: ${m.industry_fit_score}`);
          console.log(`    - Total Rank Score: ${m.total_score}`);
        });
      } else {
        console.log('No matching seller listings found for this criteria in database.');
      }
    } else {
      console.log('No buyer criteria found in database to run live RPC test.');
    }
  } catch (err) {
    console.error('Error testing match_listings_for_criteria RPC:', err);
  } finally {
    await sql.end();
  }
}

runTests();
