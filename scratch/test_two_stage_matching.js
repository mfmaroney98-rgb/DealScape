import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function runTests() {
  console.log('--- STARTING TWO-STAGE MATCHING RPC TESTS ---');
  try {
    // 1. Fetch a sample criteria set
    const criteriaRes = await sql`
      SELECT id, investment_criteria_name, naics_codes, locations FROM public.buyer_criteria LIMIT 1
    `;
    
    if (criteriaRes.length === 0) {
      console.log('No buyer criteria found in database. Cannot run RPC test.');
      return;
    }
    
    const crit = criteriaRes[0];
    console.log(`Using Criteria: ${crit.id} ("${crit.investment_criteria_name}")`);
    console.log(`NAICS: [${crit.naics_codes || ''}]`);
    console.log(`Locations: [${crit.locations || ''}]`);

    // 2. Call the get_stage1_candidates RPC function
    console.log('\nCalling get_stage1_candidates...');
    const candidates = await sql`
      SELECT 
        listing_id, 
        seller_anon_name, 
        seller_status, 
        financial_score, 
        geography_score, 
        industry_score, 
        stage1_score,
        total_score,
        match_tier
      FROM public.get_stage1_candidates(${crit.id}, 5)
    `;

    console.log(`Successfully retrieved ${candidates.length} candidates.`);
    if (candidates.length > 0) {
      candidates.forEach((c, idx) => {
        console.log(`\nCandidate #${idx + 1}: ${c.seller_anon_name} (ID: ${c.listing_id})`);
        console.log(`  Status: ${c.seller_status}`);
        console.log(`  Financial Score: ${c.financial_score}`);
        console.log(`  Geography Score: ${c.geography_score}`);
        console.log(`  Industry (NAICS) Score: ${c.industry_score}`);
        console.log(`  Stage 1 Score: ${c.stage1_score}`);
        console.log(`  Total Score (S1 Fallback): ${c.total_score}`);
        console.log(`  Match Tier: ${c.match_tier}`);
      });
    } else {
      console.log('No active matching listings returned by Stage 1.');
    }

  } catch (err) {
    console.error('Error during two-stage matching RPC test:', err);
  } finally {
    await sql.end();
  }
}

runTests();
