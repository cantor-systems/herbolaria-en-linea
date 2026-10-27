alter table public.orders
add column shipping_method text not null default 'standard';

alter table public.orders
add constraint orders_shipping_method_check
check (shipping_method in ('standard', 'express'));

drop function if exists public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
  bigint,
  bigint,
  text,
  text,
  text,
  jsonb,
  jsonb
);

create function public.create_pending_order(
  p_checkout_attempt_id uuid,
  p_external_reference text,
  p_currency text,
  p_subtotal_cents bigint,
  p_shipping_method text,
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
  if p_shipping_method not in ('standard', 'express') then
    raise exception 'invalid_shipping_method';
  end if;

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
    shipping_method,
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
    p_shipping_method,
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
    v_order.shipping_method <> p_shipping_method or
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

revoke execute on function public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
  text,
  bigint,
  bigint,
  text,
  text,
  text,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
  text,
  bigint,
  bigint,
  text,
  text,
  text,
  jsonb,
  jsonb
) to service_role;
