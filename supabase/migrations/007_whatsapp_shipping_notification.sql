alter table public.orders
add column if not exists whatsapp_shipping_notified_at timestamptz;

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

  if v_order.fulfillment_status <> 'shipped' then
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
