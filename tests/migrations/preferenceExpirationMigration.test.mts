import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../supabase/migrations/010_mercadopago_preference_expiration.sql', import.meta.url),
  'utf8'
);
const initialSchema = readFileSync(
  new URL('../../supabase/migrations/001_orders.sql', import.meta.url),
  'utf8'
);

test('keeps the new order metadata nullable and does not backfill historical rows', () => {
  const schemaChanges = migration.split(
    'create function public.attach_preference_to_order_v2'
  )[0];

  assert.match(migration, /add column mercadopago_preference_expires_at timestamptz,/);
  assert.match(migration, /add column mercadopago_offline_expires_at timestamptz,/);
  assert.match(migration, /add column order_purpose text;/);
  assert.doesNotMatch(schemaChanges, /update\s+public\.orders\s+set/i);
});

test('keeps the deployed RPC and adds a separately versioned RPC', () => {
  assert.match(
    initialSchema,
    /create function public\.attach_preference_to_order\(\s*p_external_reference text,\s*p_preference_id text\s*\)/
  );
  assert.doesNotMatch(migration, /drop function public\.attach_preference_to_order/i);
  assert.match(migration, /create function public\.attach_preference_to_order_v2\(/);
  assert.doesNotMatch(migration, /default null/i);
});

test('preserves transactional locking and rejects conflicting policy data', () => {
  assert.match(migration, /security invoker/);
  assert.match(migration, /where external_reference = p_external_reference\s+for update;/);
  assert.match(migration, /raise exception 'preference_id_conflict'/);
  assert.match(migration, /raise exception 'preference_expiration_conflict'/);
  assert.match(migration, /raise exception 'offline_expiration_conflict'/);
  assert.match(migration, /raise exception 'order_purpose_conflict'/);
});

test('restricts both new RPCs to service_role and reloads the PostgREST schema', () => {
  assert.match(
    migration,
    /revoke execute on function public\.attach_preference_to_order_v2\([\s\S]+?from public, anon, authenticated;/
  );
  assert.match(
    migration,
    /grant execute on function public\.attach_preference_to_order_v2\([\s\S]+?to service_role;/
  );
  assert.match(
    migration,
    /revoke execute on function public\.claim_preference_creation\(text\)\s+from public, anon, authenticated;/
  );
  assert.match(
    migration,
    /grant execute on function public\.claim_preference_creation\(text\)\s+to service_role;/
  );
  assert.match(migration, /notify pgrst, 'reload schema';/);
});

test('serializes preference creation without altering historical null metadata', () => {
  assert.match(migration, /create function public\.claim_preference_creation\(/);
  assert.match(migration, /preference_error_code = 'preference_creation_in_progress'/);
  assert.match(migration, /v_order\.preference_error_code <> 'preference_provider_failed'/);
  assert.doesNotMatch(
    migration.split('create function public.attach_preference_to_order_v2')[0],
    /update\s+public\.orders\s+set/i
  );
});
