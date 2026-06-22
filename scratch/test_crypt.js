import postgres from 'postgres';

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    const res = await sql`
      SELECT crypt('123456', gen_salt('bf', 10)) as hash;
    `;
    console.log('pgcrypto crypt works! Hash:', res[0].hash);
  } catch (err) {
    console.error('pgcrypto crypt is not available:', err.message);
  } finally {
    await sql.end();
  }
}

run();
