import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../supabase/migrations/010_mercadopago_preference_expiration.sql', import.meta.url),
  'utf8'
);

test('keeps the new order metadata nullable and does not backfill historical rows', () => {
  const schemaChanges = migration.split(
    'create function public.attach_preference_to_order'
  )[0];

  assert.match(migration, /add column mercadopago_preference_expires_at timestamptz,/);
  assert.match(migration, /add column mercadopago_offline_expires_at timestamptz,/);
  assert.match(migration, /add column order_purpose text;/);
  assert.doesNotMatch(schemaChanges, /update\s+public\.orders\s+set/i);
});

test('preserves compatibility with the previously deployed two-argument RPC call', () => {
  assert.match(migration, /p_preference_expires_at timestamptz default null/);
  assert.match(migration, /p_offline_expires_at timestamptz default null/);
  assert.match(migration, /p_order_purpose text default null/);
});

test('preserves preference idempotency and rejects conflicting policy data', () => {
  assert.match(migration, /raise exception 'preference_id_conflict'/);
  assert.match(migration, /raise exception 'preference_expiration_conflict'/);
  assert.match(migration, /raise exception 'offline_expiration_conflict'/);
  assert.match(migration, /raise exception 'order_purpose_conflict'/);
});
