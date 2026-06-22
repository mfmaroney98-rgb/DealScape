import postgres from 'postgres';
import fs from 'fs';

const sqlFile = fs.readFileSync('supabase/migrations/20260622_two_stage_matching.sql', 'utf8');

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    await sql.unsafe(sqlFile);
    console.log('Two-stage matching migration applied successfully');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await sql.end();
  }
}

run();
