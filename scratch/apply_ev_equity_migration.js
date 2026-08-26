import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const migrationPath = 'supabase/migrations/20260825000000_add_ev_and_equity_value_criteria.sql';
const sqlFile = fs.readFileSync(migrationPath, 'utf8');

// Use the database URL from .env if available, fallback to the direct URL
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:16l5OO3Co0UHzED4@db.laialzrtgfveczgemjto.supabase.co:5432/postgres';

const sql = postgres(dbUrl, { ssl: 'require' });

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
