import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    const users = await sql`
      SELECT id, email, encrypted_password FROM auth.users LIMIT 20;
    `;
    console.log('--- Auth Users Passwords ---');
    console.log(users);
  } catch (err) {
    console.error('Failed to list users', err);
  } finally {
    await sql.end();
  }
}

run();
