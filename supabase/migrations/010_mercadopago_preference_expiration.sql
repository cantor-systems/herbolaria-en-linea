alter table public.orders
add column mercadopago_preference_expires_at timestamptz,
add column mercadopago_offline_expires_at timestamptz,
add column order_purpose text;

alter table public.orders
add constraint orders_mercadopago_expiration_pair_check check (
  (
    mercadopago_preference_expires_at is null
    and mercadopago_offline_expires_at is null
  )
  or (
    mercadopago_preference_expires_at is not null
    and mercadopago_offline_expires_at is not null
    and mercadopago_offline_expires_at > mercadopago_preference_expires_at
  )
),
add constraint orders_order_purpose_check check (
  order_purpose is null or order_purpose in ('commercial', 'test')
);

drop function public.attach_preference_to_order(text, text);

create function public.attach_preference_to_order(
  p_external_reference text,
  p_preference_id text,
  p_preference_expires_at timestamptz default null,
  p_offline_expires_at timestamptz default null,
  p_order_purpose text default null
)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if (p_preference_expires_at is null) <> (p_offline_expires_at is null) then
    raise exception 'invalid_preference_expiration_pair';
  end if;

  if p_preference_expires_at is not null
     and p_offline_expires_at <= p_preference_expires_at then
    raise exception 'invalid_preference_expiration_order';
  end if;

  if p_order_purpose is not null
     and p_order_purpose not in ('commercial', 'test') then
    raise exception 'invalid_order_purpose';
  end if;

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

  if v_order.mercadopago_preference_expires_at is not null
     and p_preference_expires_at is not null
     and v_order.mercadopago_preference_expires_at <> p_preference_expires_at then
    raise exception 'preference_expiration_conflict';
  end if;

  if v_order.mercadopago_offline_expires_at is not null
     and p_offline_expires_at is not null
     and v_order.mercadopago_offline_expires_at <> p_offline_expires_at then
    raise exception 'offline_expiration_conflict';
  end if;

  if v_order.order_purpose is not null
     and p_order_purpose is not null
     and v_order.order_purpose <> p_order_purpose then
    raise exception 'order_purpose_conflict';
  end if;

  update public.orders
  set
    mercadopago_preference_id = p_preference_id,
    mercadopago_preference_expires_at = coalesce(
      v_order.mercadopago_preference_expires_at,
      p_preference_expires_at
    ),
    mercadopago_offline_expires_at = coalesce(
      v_order.mercadopago_offline_expires_at,
      p_offline_expires_at
    ),
    order_purpose = coalesce(v_order.order_purpose, p_order_purpose),
    preference_error_code = null,
    preference_attempted_at = now()
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

revoke execute on function public.attach_preference_to_order(
  text,
  text,
  timestamptz,
  timestamptz,
  text
) from public, anon, authenticated;

grant execute on function public.attach_preference_to_order(
  text,
  text,
  timestamptz,
  timestamptz,
  text
) to service_role;
