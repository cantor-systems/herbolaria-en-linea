alter table public.orders
add column whatsapp_notifications_opt_in boolean not null default false,
add column whatsapp_opt_in_at timestamptz,
add column fulfillment_status text not null default 'pending',
add column shipping_carrier text,
add column tracking_number text,
add column tracking_url text,
add column shipped_at timestamptz;

alter table public.orders
add constraint orders_whatsapp_opt_in_timestamp_check check (
  not whatsapp_notifications_opt_in or whatsapp_opt_in_at is not null
),
add constraint orders_fulfillment_status_check check (
  fulfillment_status in ('pending', 'shipped')
),
add constraint orders_fulfillment_details_check check (
  (fulfillment_status = 'pending' and shipped_at is null)
  or (
    fulfillment_status = 'shipped'
    and shipping_carrier is not null
    and btrim(shipping_carrier) <> ''
    and tracking_number is not null
    and btrim(tracking_number) <> ''
    and tracking_url is not null
    and btrim(tracking_url) <> ''
    and shipped_at is not null
  )
);

alter table public.order_notifications
drop constraint if exists order_notifications_notification_type_check;

alter table public.order_notifications
add constraint order_notifications_notification_type_check check (
  notification_type in (
    'admin_order_approved',
    'customer_order_approved',
    'customer_order_shipped_email'
  )
);

drop function if exists public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
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
);

create function public.create_pending_order(
  p_checkout_attempt_id uuid,
  p_external_reference text,
  p_currency text,
  p_subtotal_cents bigint,
  p_promotion_code text,
  p_discount_cents bigint,
  p_shipping_method text,
  p_shipping_cents bigint,
  p_total_cents bigint,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_whatsapp_notifications_opt_in boolean,
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

  if p_whatsapp_notifications_opt_in is null then
    raise exception 'invalid_whatsapp_notifications_opt_in';
  end if;

  if p_discount_cents < 0 or p_discount_cents > p_subtotal_cents then
    raise exception 'invalid_discount';
  end if;

  if (
    (p_promotion_code is null and p_discount_cents <> 0)
    or (p_promotion_code is not null and p_discount_cents = 0)
  ) then
    raise exception 'invalid_promotion_discount';
  end if;

  if p_total_cents <> p_subtotal_cents - p_discount_cents + p_shipping_cents then
    raise exception 'order_total_mismatch';
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
    promotion_code,
    discount_cents,
    shipping_method,
    shipping_cents,
    total_cents,
    customer_email,
    customer_name,
    customer_phone,
    whatsapp_notifications_opt_in,
    whatsapp_opt_in_at,
    shipping_address
  ) values (
    p_checkout_attempt_id,
    p_external_reference,
    'pending_payment',
    p_currency,
    p_subtotal_cents,
    p_promotion_code,
    p_discount_cents,
    p_shipping_method,
    p_shipping_cents,
    p_total_cents,
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    p_whatsapp_notifications_opt_in,
    case when p_whatsapp_notifications_opt_in then now() else null end,
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
    v_order.promotion_code is distinct from p_promotion_code or
    v_order.discount_cents <> p_discount_cents or
    v_order.shipping_method <> p_shipping_method or
    v_order.shipping_cents <> p_shipping_cents or
    v_order.total_cents <> p_total_cents or
    v_order.customer_email is distinct from p_customer_email or
    v_order.customer_name is distinct from p_customer_name or
    v_order.customer_phone is distinct from p_customer_phone or
    v_order.whatsapp_notifications_opt_in is distinct from p_whatsapp_notifications_opt_in or
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

create function public.mark_order_shipped(
  p_order_id uuid,
  p_shipping_carrier text,
  p_tracking_number text,
  p_tracking_url text
)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shipping_carrier text := btrim(p_shipping_carrier);
  v_tracking_number text := btrim(p_tracking_number);
  v_tracking_url text := btrim(p_tracking_url);
begin
  if
    v_shipping_carrier is null
    or char_length(v_shipping_carrier) < 1
    or char_length(v_shipping_carrier) > 100
    or v_shipping_carrier ~ '[[:cntrl:]<>]'
  then
    raise exception 'invalid_shipping_carrier';
  end if;

  if
    v_tracking_number is null
    or char_length(v_tracking_number) < 1
    or char_length(v_tracking_number) > 120
    or v_tracking_number ~ '[[:cntrl:]<>]'
  then
    raise exception 'invalid_tracking_number';
  end if;

  if
    v_tracking_url is null
    or char_length(v_tracking_url) < 12
    or char_length(v_tracking_url) > 2048
    or v_tracking_url !~* '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?([/?#][^[:space:]<>]*)?$'
  then
    raise exception 'invalid_tracking_url';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'order_not_found';
  end if;

  if v_order.status <> 'approved' then
    raise exception 'order_not_approved';
  end if;

  if v_order.fulfillment_status = 'shipped' then
    if
      v_order.shipping_carrier = v_shipping_carrier
      and v_order.tracking_number = v_tracking_number
      and v_order.tracking_url = v_tracking_url
    then
      return next v_order;
      return;
    end if;

    raise exception 'order_already_shipped_conflict';
  end if;

  if v_order.fulfillment_status <> 'pending' then
    raise exception 'invalid_fulfillment_status';
  end if;

  update public.orders
  set
    fulfillment_status = 'shipped',
    shipping_carrier = v_shipping_carrier,
    tracking_number = v_tracking_number,
    tracking_url = v_tracking_url,
    shipped_at = now(),
    updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

create function public.prevent_order_fulfillment_reversal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.fulfillment_status = 'shipped' and new.fulfillment_status <> 'shipped' then
    raise exception 'fulfillment_status_cannot_revert';
  end if;

  return new;
end;
$$;

create trigger prevent_order_fulfillment_reversal
before update of fulfillment_status on public.orders
for each row
execute function public.prevent_order_fulfillment_reversal();

create function public.enqueue_customer_order_shipped_email_notification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if
    new.fulfillment_status = 'shipped'
    and old.fulfillment_status is distinct from 'shipped'
  then
    insert into public.order_notifications (
      order_id,
      notification_type,
      status
    ) values (
      new.id,
      'customer_order_shipped_email',
      'pending'
    )
    on conflict (order_id, notification_type) do nothing;
  end if;

  return new;
end;
$$;

create trigger enqueue_customer_order_shipped_email_notification
after update of fulfillment_status on public.orders
for each row
execute function public.enqueue_customer_order_shipped_email_notification();

create function public.claim_customer_order_shipped_email_notification(
  p_order_id uuid
)
returns setof public.order_notifications
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.order_notifications
  set
    status = 'processing',
    attempts = attempts + 1,
    last_error = null,
    updated_at = now()
  where order_id = p_order_id
    and notification_type = 'customer_order_shipped_email'
    and (
      status in ('pending', 'failed')
      or (
        status = 'processing'
        and updated_at < now() - interval '15 minutes'
      )
    )
  returning *;
end;
$$;

revoke execute on function public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
  text,
  bigint,
  text,
  bigint,
  bigint,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) from public, anon, authenticated;

revoke execute on function public.mark_order_shipped(uuid, text, text, text)
from public, anon, authenticated;

revoke execute on function public.enqueue_customer_order_shipped_email_notification()
from public, anon, authenticated;

revoke execute on function public.prevent_order_fulfillment_reversal()
from public, anon, authenticated;

revoke execute on function public.claim_customer_order_shipped_email_notification(uuid)
from public, anon, authenticated;

grant execute on function public.create_pending_order(
  uuid,
  text,
  text,
  bigint,
  text,
  bigint,
  text,
  bigint,
  bigint,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) to service_role;

grant execute on function public.mark_order_shipped(uuid, text, text, text)
to service_role;

grant execute on function public.claim_customer_order_shipped_email_notification(uuid)
to service_role;
