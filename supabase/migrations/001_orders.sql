create extension if not exists pgcrypto;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_attempt_id uuid unique not null,
  external_reference text unique not null,
  mercadopago_preference_id text unique,
  mercadopago_payment_id text unique,
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'approved', 'pending', 'rejected', 'cancelled', 'refunded', 'charged_back')
  ),
  provider_status text,
  currency text not null default 'MXN' check (currency = 'MXN'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  shipping_cents bigint not null check (shipping_cents >= 0),
  total_cents bigint not null check (
    total_cents > 0 and total_cents = subtotal_cents + shipping_cents
  ),
  customer_email text,
  customer_name text,
  customer_phone text,
  shipping_address jsonb,
  preference_error_code text,
  preference_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  variant_id text not null,
  variant_label text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  line_total_cents bigint not null check (
    line_total_cents >= 0 and line_total_cents = unit_price_cents * quantity
  ),
  created_at timestamptz not null default now(),
  unique (order_id, product_slug, variant_id)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider = 'mercadopago'),
  payment_id text,
  event_type text not null,
  provider_status text,
  dedupe_key text unique not null,
  created_at timestamptz not null default now()
);

create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index payment_events_order_id_created_at_idx on public.payment_events (order_id, created_at desc);

create function public.set_order_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_order_updated_at();

create function public.create_pending_order(
  p_checkout_attempt_id uuid,
  p_external_reference text,
  p_currency text,
  p_subtotal_cents bigint,
  p_shipping_cents bigint,
  p_total_cents bigint,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_items jsonb
)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_created boolean := false;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_order_items';
  end if;

  if (
    select coalesce(sum(item.line_total_cents), 0)
    from jsonb_to_recordset(p_items) as item(line_total_cents bigint)
  ) <> p_subtotal_cents then
    raise exception 'order_items_subtotal_mismatch';
  end if;

  insert into public.orders (
    checkout_attempt_id,
    external_reference,
    status,
    currency,
    subtotal_cents,
    shipping_cents,
    total_cents,
    customer_email,
    customer_name,
    customer_phone,
    shipping_address
  ) values (
    p_checkout_attempt_id,
    p_external_reference,
    'pending_payment',
    p_currency,
    p_subtotal_cents,
    p_shipping_cents,
    p_total_cents,
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    p_shipping_address
  )
  on conflict (checkout_attempt_id) do nothing
  returning * into v_order;

  if v_order.id is not null then
    v_created := true;

    insert into public.order_items (
      order_id,
      product_slug,
      product_name,
      variant_id,
      variant_label,
      quantity,
      unit_price_cents,
      line_total_cents
    )
    select
      v_order.id,
      item.product_slug,
      item.product_name,
      item.variant_id,
      item.variant_label,
      item.quantity,
      item.unit_price_cents,
      item.line_total_cents
    from jsonb_to_recordset(p_items) as item(
      product_slug text,
      product_name text,
      variant_id text,
      variant_label text,
      quantity integer,
      unit_price_cents bigint,
      line_total_cents bigint
    );
  else
    -- The durable order wins on retry. Its server-generated external_reference
    -- is returned after the immutable checkout contents are verified below.
    select * into v_order
    from public.orders
    where checkout_attempt_id = p_checkout_attempt_id
    for update;
  end if;

  if v_order.id is null then
    raise exception 'order_creation_failed';
  end if;

  if not v_created and (
    v_order.currency <> p_currency or
    v_order.subtotal_cents <> p_subtotal_cents or
    v_order.shipping_cents <> p_shipping_cents or
    v_order.total_cents <> p_total_cents or
    v_order.customer_email is distinct from p_customer_email or
    v_order.customer_name is distinct from p_customer_name or
    v_order.customer_phone is distinct from p_customer_phone or
    v_order.shipping_address is distinct from p_shipping_address or
    (select count(*) from public.order_items where order_id = v_order.id) <> jsonb_array_length(p_items) or
    exists (
      select 1
      from jsonb_to_recordset(p_items) as requested(
        product_slug text,
        product_name text,
        variant_id text,
        variant_label text,
        quantity integer,
        unit_price_cents bigint,
        line_total_cents bigint
      )
      left join public.order_items stored
        on stored.order_id = v_order.id
       and stored.product_slug = requested.product_slug
       and stored.variant_id = requested.variant_id
      where stored.id is null
         or stored.product_name <> requested.product_name
         or stored.variant_label <> requested.variant_label
         or stored.quantity <> requested.quantity
         or stored.unit_price_cents <> requested.unit_price_cents
         or stored.line_total_cents <> requested.line_total_cents
    )
  ) then
    raise exception 'checkout_idempotency_conflict';
  end if;

  return next v_order;
end;
$$;

create function public.attach_preference_to_order(
  p_external_reference text,
  p_preference_id text
)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where external_reference = p_external_reference
  for update;

  if v_order.id is null then
    return;
  end if;

  if v_order.mercadopago_preference_id is not null
     and v_order.mercadopago_preference_id <> p_preference_id then
    raise exception 'preference_id_conflict';
  end if;

  update public.orders
  set
    mercadopago_preference_id = p_preference_id,
    preference_error_code = null,
    preference_attempted_at = now()
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

create function public.record_preference_failure(
  p_external_reference text,
  p_error_code text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.orders
  set
    preference_error_code = left(p_error_code, 100),
    preference_attempted_at = now()
  where external_reference = p_external_reference
    and mercadopago_preference_id is null;
$$;

create function public.record_verified_payment(
  p_external_reference text,
  p_payment_id text,
  p_provider_status text,
  p_internal_status text,
  p_total_cents bigint,
  p_event_type text,
  p_dedupe_key text
)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_next_status text;
  v_can_assign_approved boolean;
begin
  select * into v_order
  from public.orders
  where external_reference = p_external_reference
  for update;

  if v_order.id is null then
    return;
  end if;

  if v_order.total_cents <> p_total_cents then
    raise exception 'verified_total_mismatch';
  end if;

  if p_internal_status is not null and p_internal_status not in (
    'approved', 'pending', 'rejected', 'cancelled', 'refunded', 'charged_back'
  ) then
    raise exception 'invalid_internal_status';
  end if;

  -- Serialize assignment of a provider payment across orders. This lets a
  -- conflicting approved attempt remain auditable without violating the
  -- unique final-payment constraint on orders.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mercadopago:' || p_payment_id, 0)
  );

  v_can_assign_approved :=
    p_internal_status is distinct from 'approved'
    or v_order.mercadopago_payment_id = p_payment_id
    or (
      v_order.mercadopago_payment_id is null
      and not exists (
        select 1
        from public.orders other_order
        where other_order.mercadopago_payment_id = p_payment_id
          and other_order.id <> v_order.id
      )
    );

  insert into public.payment_events (
    order_id,
    provider,
    payment_id,
    event_type,
    provider_status,
    dedupe_key
  ) values (
    v_order.id,
    'mercadopago',
    p_payment_id,
    left(p_event_type, 100),
    left(p_provider_status, 100),
    left(p_dedupe_key, 240)
  )
  on conflict (dedupe_key) do nothing;

  v_next_status := v_order.status;

  if p_internal_status in ('refunded', 'charged_back')
     and (
       v_order.mercadopago_payment_id is null
       or v_order.mercadopago_payment_id = p_payment_id
     ) then
    v_next_status := p_internal_status;
  elsif v_order.status in ('refunded', 'charged_back') then
    v_next_status := v_order.status;
  elsif p_internal_status = 'approved' and v_can_assign_approved then
    v_next_status := 'approved';
  elsif p_internal_status = 'approved' then
    v_next_status := v_order.status;
  elsif v_order.status = 'approved' then
    v_next_status := 'approved';
  elsif v_order.status in ('rejected', 'cancelled') and p_internal_status = 'pending' then
    v_next_status := v_order.status;
  elsif p_internal_status is not null then
    v_next_status := p_internal_status;
  end if;

  update public.orders
  set
    mercadopago_payment_id = case
      when p_internal_status = 'approved' and v_can_assign_approved
      then p_payment_id
      else v_order.mercadopago_payment_id
    end,
    provider_status = case
      when p_internal_status = 'approved' and not v_can_assign_approved
      then v_order.provider_status
      when v_order.mercadopago_payment_id is null
        or v_order.mercadopago_payment_id = p_payment_id
      then left(p_provider_status, 100)
      else v_order.provider_status
    end,
    status = v_next_status,
    paid_at = case
      when v_next_status = 'approved' then coalesce(paid_at, now())
      else paid_at
    end
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

revoke all on table public.orders, public.order_items, public.payment_events from anon, authenticated;
grant all on table public.orders, public.order_items, public.payment_events to service_role;

revoke execute on function public.set_order_updated_at() from public, anon, authenticated;
revoke execute on function public.create_pending_order(uuid, text, text, bigint, bigint, bigint, text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.attach_preference_to_order(text, text) from public, anon, authenticated;
revoke execute on function public.record_preference_failure(text, text) from public, anon, authenticated;
revoke execute on function public.record_verified_payment(text, text, text, text, bigint, text, text) from public, anon, authenticated;

grant execute on function public.create_pending_order(uuid, text, text, bigint, bigint, bigint, text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.attach_preference_to_order(text, text) to service_role;
grant execute on function public.record_preference_failure(text, text) to service_role;
grant execute on function public.record_verified_payment(text, text, text, text, bigint, text, text) to service_role;
