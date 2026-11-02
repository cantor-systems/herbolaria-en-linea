begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select ok(
  to_regprocedure('public.attach_preference_to_order(text,text)') is not null,
  'the deployed two-argument RPC still exists'
);
select ok(
  to_regprocedure(
    'public.attach_preference_to_order_v2(text,text,timestamptz,timestamptz,text)'
  ) is not null,
  'the versioned RPC exists'
);
select ok(
  to_regprocedure('public.claim_preference_creation(text)') is not null,
  'the creation-claim RPC exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.attach_preference_to_order(text,text)',
    'execute'
  ),
  'anon cannot execute the deployed RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.attach_preference_to_order(text,text)',
    'execute'
  ),
  'authenticated cannot execute the deployed RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.attach_preference_to_order(text,text)',
    'execute'
  ),
  'service_role can execute the deployed RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.attach_preference_to_order_v2(text,text,timestamptz,timestamptz,text)',
    'execute'
  ),
  'anon cannot execute the versioned RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.attach_preference_to_order_v2(text,text,timestamptz,timestamptz,text)',
    'execute'
  ),
  'authenticated cannot execute the versioned RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.attach_preference_to_order_v2(text,text,timestamptz,timestamptz,text)',
    'execute'
  ),
  'service_role can execute the versioned RPC'
);
select ok(
  not has_function_privilege('anon', 'public.claim_preference_creation(text)', 'execute'),
  'anon cannot claim preference creation'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_preference_creation(text)',
    'execute'
  ),
  'authenticated cannot claim preference creation'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_preference_creation(text)',
    'execute'
  ),
  'service_role can claim preference creation'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'orders keeps row-level security enabled'
);

insert into public.orders (
  checkout_attempt_id,
  external_reference,
  subtotal_cents,
  shipping_cents,
  total_cents
) values
  ('11111111-1111-4111-8111-111111111111', 'h7-test-legacy', 89900, 0, 89900),
  ('22222222-2222-4222-8222-222222222222', 'h7-test-v2', 84900, 5000, 89900),
  ('33333333-3333-4333-8333-333333333333', 'h7-test-claim', 89900, 0, 89900);

select is(
  (
    select count(*)::bigint
    from public.attach_preference_to_order('h7-test-legacy', 'pref-legacy')
  ),
  1::bigint,
  'the deployed RPC returns the attached order'
);
select is(
  (select mercadopago_preference_id from public.orders where external_reference = 'h7-test-legacy'),
  'pref-legacy',
  'the deployed RPC stores the preference id'
);
select ok(
  (select mercadopago_preference_expires_at is null from public.orders where external_reference = 'h7-test-legacy'),
  'the deployed RPC keeps historical preference expiry null'
);
select ok(
  (select mercadopago_offline_expires_at is null from public.orders where external_reference = 'h7-test-legacy'),
  'the deployed RPC keeps historical offline expiry null'
);
select ok(
  (select order_purpose is null from public.orders where external_reference = 'h7-test-legacy'),
  'the deployed RPC does not classify historical orders'
);

select is(
  (
    select count(*)::bigint
    from public.attach_preference_to_order_v2(
      'h7-test-v2',
      'pref-v2',
      '2026-11-01T12:30:00Z',
      '2026-11-04T12:30:00Z',
      'commercial'
    )
  ),
  1::bigint,
  'the versioned RPC returns the attached order'
);
select is(
  (select mercadopago_preference_id from public.orders where external_reference = 'h7-test-v2'),
  'pref-v2',
  'the versioned RPC stores the preference id'
);
select is(
  (select mercadopago_preference_expires_at from public.orders where external_reference = 'h7-test-v2'),
  '2026-11-01T12:30:00Z'::timestamptz,
  'the versioned RPC stores checkout expiry'
);
select is(
  (select mercadopago_offline_expires_at from public.orders where external_reference = 'h7-test-v2'),
  '2026-11-04T12:30:00Z'::timestamptz,
  'the versioned RPC stores offline expiry'
);
select is(
  (select order_purpose from public.orders where external_reference = 'h7-test-v2'),
  'commercial',
  'the versioned RPC stores order purpose'
);
select is(
  (
    select count(*)::bigint
    from public.attach_preference_to_order_v2(
      'h7-test-v2',
      'pref-v2',
      '2026-11-01T12:30:00Z',
      '2026-11-04T12:30:00Z',
      'commercial'
    )
  ),
  1::bigint,
  'the versioned RPC is idempotent for identical data'
);

select is(
  (select count(*)::bigint from public.claim_preference_creation('h7-test-claim')),
  1::bigint,
  'the first creation claim succeeds'
);
select is(
  (select count(*)::bigint from public.claim_preference_creation('h7-test-claim')),
  0::bigint,
  'a second creation claim is rejected'
);
select is(
  (select preference_error_code from public.orders where external_reference = 'h7-test-claim'),
  'preference_creation_in_progress',
  'the claim leaves a durable in-progress marker'
);

update public.orders
set preference_error_code = 'preference_provider_failed'
where external_reference = 'h7-test-claim';

select is(
  (select count(*)::bigint from public.claim_preference_creation('h7-test-claim')),
  1::bigint,
  'a definitive provider failure permits a controlled retry'
);
select is(
  (select preference_error_code from public.orders where external_reference = 'h7-test-claim'),
  'preference_creation_in_progress',
  'the controlled retry restores the in-progress marker'
);

select * from finish();
rollback;
