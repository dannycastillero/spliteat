#!/usr/bin/env node
/**
 * SplitEat v3 — Supabase automated setup
 *
 * Uses the Supabase Management API to:
 *   1. Create the project (if SUPABASE_PROJECT_ID is not set)
 *   2. Run the bills table + RLS migration
 *   3. Configure auth (magic link + redirect URL)
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN  — Personal Access Token from https://app.supabase.com/account/tokens
 *   SUPABASE_ORG_ID        — Organization ID from https://app.supabase.com/org (Settings → General)
 *   SUPABASE_DB_PASSWORD   — Password for the new project DB (choose one, min 16 chars)
 *   SUPABASE_PROJECT_ID    — (optional) If project already exists, skip creation
 */

const BASE = 'https://api.supabase.com/v1'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const ORG_ID = process.env.SUPABASE_ORG_ID
const DB_PASS = process.env.SUPABASE_DB_PASSWORD
let PROJECT_ID = process.env.SUPABASE_PROJECT_ID

if (!TOKEN) {
  console.error('ERROR: Set SUPABASE_ACCESS_TOKEN env var.')
  console.error('Get it from: https://app.supabase.com/account/tokens')
  process.exit(1)
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${method} ${path} failed (${res.status}): ${err}`)
  }
  return res.status === 204 ? null : res.json()
}

async function waitForProject(id) {
  process.stdout.write('Waiting for project to be ready')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const proj = await api('GET', `/projects/${id}`)
    process.stdout.write('.')
    if (proj.status === 'ACTIVE_HEALTHY') {
      console.log(' ready!')
      return
    }
  }
  throw new Error('Project did not become healthy in 5 minutes')
}

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS bills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id    ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bills' AND policyname='insert_any') THEN
    CREATE POLICY "insert_any" ON bills FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bills' AND policyname='select_own') THEN
    CREATE POLICY "select_own" ON bills FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bills' AND policyname='select_anonymous') THEN
    CREATE POLICY "select_anonymous" ON bills FOR SELECT USING (user_id IS NULL);
  END IF;
END $$;
`

async function main() {
  // Step 1: Create project (or use existing)
  if (!PROJECT_ID) {
    if (!ORG_ID || !DB_PASS) {
      console.error('ERROR: Set SUPABASE_ORG_ID and SUPABASE_DB_PASSWORD to create a new project.')
      console.error('Or set SUPABASE_PROJECT_ID to use an existing project.')
      process.exit(1)
    }
    console.log('Creating Supabase project...')
    const proj = await api('POST', '/projects', {
      name: 'spliteat',
      organization_id: ORG_ID,
      db_pass: DB_PASS,
      region: 'us-east-1',
    })
    PROJECT_ID = proj.id
    console.log(`Project created: ${proj.id}`)
    await waitForProject(PROJECT_ID)
  } else {
    console.log(`Using existing project: ${PROJECT_ID}`)
  }

  // Step 2: Run migration
  console.log('Running migration (bills table + RLS)...')
  await api('POST', `/projects/${PROJECT_ID}/database/query`, { query: MIGRATION_SQL })
  console.log('Migration applied.')

  // Step 3: Configure auth redirect URL
  console.log('Configuring auth redirect URL...')
  await api('PATCH', `/projects/${PROJECT_ID}/config/auth`, {
    site_url: 'https://spliteat.vercel.app',
    uri_allow_list: 'https://spliteat.vercel.app/auth/callback,http://localhost:5173/auth/callback',
    mailer_autoconfirm: true,
  })
  console.log('Auth configured.')

  // Step 4: Get API keys
  const keys = await api('GET', `/projects/${PROJECT_ID}/api-keys`)
  const anonKey = keys.find(k => k.name === 'anon')?.api_key
  const serviceKey = keys.find(k => k.name === 'service_role')?.api_key
  const proj = await api('GET', `/projects/${PROJECT_ID}`)
  const url = `https://${PROJECT_ID}.supabase.co`

  console.log('\n=== SETUP COMPLETE ===')
  console.log('\nAdd these to Vercel Environment Variables:')
  console.log(`  SUPABASE_URL=${url}`)
  console.log(`  SUPABASE_ANON_KEY=${anonKey}`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`)
  console.log(`  VITE_SUPABASE_URL=${url}`)
  console.log(`  VITE_SUPABASE_ANON_KEY=${anonKey}`)
  console.log('\nAdd these to client/.env.local for local dev:')
  console.log(`  VITE_SUPABASE_URL=${url}`)
  console.log(`  VITE_SUPABASE_ANON_KEY=${anonKey}`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
