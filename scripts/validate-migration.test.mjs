/**
 * Task 1 verification: validates the bills migration SQL is syntactically
 * correct and contains all required elements (table, indexes, RLS policies).
 * Runs without a live database using pgsql-parser.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'pgsql-parser'

const MIGRATION = readFileSync(
  new URL('../supabase/migrations/20260603000000_create_bills.sql', import.meta.url),
  'utf8'
)

test('migration SQL parses as valid PostgreSQL', () => {
  // If this throws, the SQL has a syntax error
  const statements = parse(MIGRATION)
  assert.ok(statements, 'should parse without error')
})

test('migration creates bills table', () => {
  assert.ok(
    MIGRATION.includes('CREATE TABLE bills'),
    'should create bills table'
  )
})

test('migration has all required columns', () => {
  assert.ok(MIGRATION.includes('id'), 'should have id column')
  assert.ok(MIGRATION.includes('created_at'), 'should have created_at column')
  assert.ok(MIGRATION.includes('user_id'), 'should have user_id column')
  assert.ok(MIGRATION.includes('data'), 'should have data column')
  assert.ok(MIGRATION.includes('JSONB'), 'data column should be JSONB')
  assert.ok(MIGRATION.includes('UUID'), 'id should be UUID')
})

test('migration enables Row Level Security', () => {
  assert.ok(
    MIGRATION.includes('ENABLE ROW LEVEL SECURITY'),
    'should enable RLS on bills table'
  )
})

test('migration creates all three RLS policies', () => {
  assert.ok(MIGRATION.includes('"insert_any"'), 'should have insert_any policy')
  assert.ok(MIGRATION.includes('"select_own"'), 'should have select_own policy')
  assert.ok(MIGRATION.includes('"select_anonymous"'), 'should have select_anonymous policy')
})

test('insert_any policy allows anyone to insert', () => {
  assert.ok(
    MIGRATION.includes('FOR INSERT WITH CHECK (true)'),
    'insert_any should allow all inserts'
  )
})

test('select_own policy restricts to authenticated user', () => {
  assert.ok(
    MIGRATION.includes('auth.uid() = user_id'),
    'select_own should check auth.uid() matches user_id'
  )
})

test('select_anonymous policy allows reading anonymous bills', () => {
  assert.ok(
    MIGRATION.includes('user_id IS NULL'),
    'select_anonymous should check user_id IS NULL'
  )
})

test('migration creates performance indexes', () => {
  assert.ok(MIGRATION.includes('idx_bills_user_id'), 'should have user_id index')
  assert.ok(MIGRATION.includes('idx_bills_created_at'), 'should have created_at index')
})

test('user_id references auth.users (Supabase built-in)', () => {
  assert.ok(
    MIGRATION.includes('REFERENCES auth.users'),
    'user_id should reference auth.users'
  )
})
