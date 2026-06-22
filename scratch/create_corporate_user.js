import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const dbUrl = env.DATABASE_URL;

if (!supabaseUrl || !supabaseAnonKey || !dbUrl) {
  console.error('Missing configuration in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const sql = postgres(dbUrl, { ssl: 'require' });

const email = process.argv[2] || 'corporate@dealscape';
const password = process.argv[3] || '123456';

async function main() {
  console.log(`Creating corporate user: ${email} with password: ${password}`);

  if (password.length < 6) {
    console.error('Error: Supabase requires a password of at least 6 characters.');
    process.exit(1);
  }

  try {
    // 1. Check if user already exists in auth.users
    const existingUsers = await sql`
      SELECT id FROM auth.users WHERE email = ${email};
    `;

    let userId;
    if (existingUsers.length > 0) {
      console.log('User already exists in auth.users. Resetting password and updating...');
      userId = existingUsers[0].id;

      // Reset password using pgcrypto crypt function directly in Postgres
      await sql`
        UPDATE auth.users
        SET encrypted_password = crypt(${password}, gen_salt('bf', 10)),
            email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${userId};
      `;
      console.log('Password reset successfully.');
    } else {
      // Sign up using Supabase JS client
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      userId = data.user.id;
      console.log(`Created new Supabase auth user with ID: ${userId}`);

      // Bypass email confirmation in postgres
      await sql`
        UPDATE auth.users
        SET email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${userId};
      `;
      console.log('Bypassed email verification.');
    }

    // 2. Ensure identity is marked verified
    await sql`
      UPDATE auth.identities
      SET identity_data = identity_data || '{"email_verified": true}'::jsonb,
          updated_at = NOW()
      WHERE user_id = ${userId};
    `;

    // 3. Upsert user profile as 'corporate' and link to corporate organization (DealScape Corporate)
    const orgId = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d'; // DealScape Corporate org ID
    await sql`
      INSERT INTO public.user_profiles (id, name, role, organization_id, updated_at)
      VALUES (${userId}, 'Corporate User', 'corporate', ${orgId}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET role = 'corporate',
          organization_id = ${orgId},
          updated_at = NOW();
    `;
    console.log(`Successfully configured user profile as corporate linked to organization ${orgId}`);
    console.log(`\n🎉 You can now log in using:\nEmail: ${email}\nPassword: ${password}`);

  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    await sql.end();
  }
}

main();
