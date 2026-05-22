import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const migrationPath = 'supabase/migrations/20260522_naics_waterfall_matching.sql';
const sqlFile = fs.readFileSync(migrationPath, 'utf8');

const sql = postgres('postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  console.log(`Running migration: ${migrationPath}`);
  try {
    await sql.unsafe(sqlFile);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
