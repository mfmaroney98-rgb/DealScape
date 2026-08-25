import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function testTrigger() {
  try {
    console.log('1. Creating a temporary organization...');
    const [testOrg] = await sql`
      INSERT INTO public.organizations (organization_name, type)
      VALUES ('Trigger Test Org Inc', 'buyer')
      RETURNING id, organization_name;
    `;
    console.log(`Created Org: ${testOrg.organization_name} (ID: ${testOrg.id})`);

    console.log('2. Inserting a buyer_criteria record (specifying ONLY organization_id, not organization_name)...');
    
    // We need a dummy user_id. Let's find an existing user_profile.
    const [dummyUser] = await sql`SELECT id FROM public.user_profiles LIMIT 1;`;
    if (!dummyUser) {
      throw new Error('No user profile found to associate with buyer criteria');
    }

    const [newCriteria] = await sql`
      INSERT INTO public.buyer_criteria (user_id, organization_id, locations, keywords, pref_transaction_type)
      VALUES (${dummyUser.id}, ${testOrg.id}, '{}', '{}', '{}')
      RETURNING id, organization_id, organization_name;
    `;
    console.log(`Inserted buyer_criteria with organization_id = ${newCriteria.organization_id}`);
    console.log(`Auto-populated organization_name = "${newCriteria.organization_name}"`);

    if (newCriteria.organization_name === 'Trigger Test Org Inc') {
      console.log('✅ Trigger 1 (Insert): Auto-populating organization_name works!');
    } else {
      console.error(`❌ Trigger 1 (Insert) FAILED: Expected "Trigger Test Org Inc", got "${newCriteria.organization_name}"`);
    }

    console.log('3. Updating the organization name in organizations table...');
    await sql`
      UPDATE public.organizations
      SET organization_name = 'Updated Trigger Test Org'
      WHERE id = ${testOrg.id};
    `;

    const [updatedCriteria] = await sql`
      SELECT id, organization_name
      FROM public.buyer_criteria
      WHERE id = ${newCriteria.id};
    `;
    console.log(`Updated organization_name on criteria = "${updatedCriteria.organization_name}"`);

    if (updatedCriteria.organization_name === 'Updated Trigger Test Org') {
      console.log('✅ Trigger 2 (Propagate name update) works!');
    } else {
      console.error(`❌ Trigger 2 (Propagate name update) FAILED: Expected "Updated Trigger Test Org", got "${updatedCriteria.organization_name}"`);
    }

    console.log('4. Cleaning up test data...');
    await sql`DELETE FROM public.buyer_criteria WHERE id = ${newCriteria.id};`;
    await sql`DELETE FROM public.organizations WHERE id = ${testOrg.id};`;
    console.log('Clean up complete.');

  } catch (err) {
    console.error('Trigger testing failed:', err);
  } finally {
    await sql.end();
  }
}

testTrigger();
