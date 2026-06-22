import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    const identities = await sql`
      SELECT * FROM auth.identities LIMIT 2;
    `;
    console.log('--- Auth Identities ---');
    console.log(identities);
  } catch (err) {
    console.error('Failed to list identities', err);
  } finally {
    await sql.end();
  }
}

run();
