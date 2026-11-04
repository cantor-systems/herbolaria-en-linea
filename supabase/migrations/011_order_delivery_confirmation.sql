-- Atomic replacement: the existing reversal trigger stays installed throughout.
begin;
set local lock_timeout = '5s';
lock table public.orders in access exclusive mode;

alter table public.orders
  add column delivered_at timestamptz,
  add column delivery_confirmation_source text;

alter table public.orders
  drop constraint orders_fulfillment_status_check,
  drop constraint orders_fulfillment_details_check,
  add constraint orders_fulfillment_status_check check (
    fulfillment_status in ('pending', 'shipped', 'delivered')
  ),
  add constraint orders_fulfillment_details_check check (
    (fulfillment_status = 'pending' and shipped_at is null)
    or (
      fulfillment_status in ('shipped', 'delivered')
      and shipping_carrier is not null and btrim(shipping_carrier) <> ''
      and tracking_number is not null and btrim(tracking_number) <> ''
      and tracking_url is not null and btrim(tracking_url) <> ''
      and shipped_at is not null
    )
  ),
  add constraint orders_delivery_confirmation_check check (
    (fulfillment_status in ('pending', 'shipped')
      and delivered_at is null and delivery_confirmation_source is null)
    or (fulfillment_status = 'delivered'
      and delivered_at is not null
      and delivery_confirmation_source is not null
      and delivery_confirmation_source = 'admin_manual')
  );

create or replace function public.prevent_order_fulfillment_reversal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.fulfillment_status is distinct from new.fulfillment_status
    and not (
      (old.fulfillment_status = 'pending' and new.fulfillment_status = 'shipped')
      or (old.fulfillment_status = 'shipped' and new.fulfillment_status = 'delivered')
    )
  then
    if old.fulfillment_status in ('shipped', 'delivered') then
      raise exception 'fulfillment_status_cannot_revert';
    end if;
    raise exception 'invalid_fulfillment_transition';
  end if;
  return new;
end;
$$;

create function public.mark_order_delivered(p_order_id uuid)
returns setof public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_confirmed_at timestamptz;
begin
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
  if v_order.fulfillment_status = 'delivered' then
    return next v_order;
    return;
  end if;
  if v_order.fulfillment_status <> 'shipped' then
    raise exception 'order_not_shipped';
  end if;

  -- Administrative confirmation time, captured after obtaining the row lock.
  v_confirmed_at := clock_timestamp();
  update public.orders
  set fulfillment_status = 'delivered',
      delivered_at = v_confirmed_at,
      delivery_confirmation_source = 'admin_manual'
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

-- Full compatible definitions; retain validation, locking and idempotency.
create or replace function public.mark_order_shipped(
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

  if v_order.fulfillment_status in ('shipped', 'delivered') then
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

create or replace function public.mark_whatsapp_shipping_notified(
  p_order_id uuid
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
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'order_not_found';
  end if;

  if v_order.status <> 'approved' then
    raise exception 'order_not_approved';
  end if;

  if v_order.fulfillment_status not in ('shipped', 'delivered') then
    raise exception 'order_not_shipped';
  end if;

  if v_order.whatsapp_notifications_opt_in is distinct from true then
    raise exception 'whatsapp_notifications_not_authorized';
  end if;

  if v_order.customer_phone is null or btrim(v_order.customer_phone) = '' then
    raise exception 'customer_phone_missing';
  end if;

  if v_order.tracking_number is null or btrim(v_order.tracking_number) = '' then
    raise exception 'tracking_number_missing';
  end if;

  if v_order.tracking_url is null or btrim(v_order.tracking_url) = '' then
    raise exception 'tracking_url_missing';
  end if;

  if v_order.whatsapp_shipping_notified_at is null then
    update public.orders
    set
      whatsapp_shipping_notified_at = now(),
      updated_at = now()
    where id = v_order.id
    returning * into v_order;
  end if;

  return next v_order;
end;
$$;

revoke execute on function public.mark_whatsapp_shipping_notified(uuid)
from public, anon, authenticated;

grant execute on function public.mark_whatsapp_shipping_notified(uuid)
to service_role;

revoke execute on function public.mark_order_delivered(uuid)
from public, anon, authenticated;
grant execute on function public.mark_order_delivered(uuid) to service_role;

revoke execute on function public.mark_order_shipped(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.mark_order_shipped(uuid, text, text, text) to service_role;

revoke execute on function public.prevent_order_fulfillment_reversal()
from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
