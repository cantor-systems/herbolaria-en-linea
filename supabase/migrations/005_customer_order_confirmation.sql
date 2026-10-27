alter table public.order_notifications
drop constraint if exists order_notifications_notification_type_check;

alter table public.order_notifications
add constraint order_notifications_notification_type_check
check (notification_type in ('admin_order_approved', 'customer_order_approved'));

create or replace function public.enqueue_admin_order_approved_notification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.order_notifications (
      order_id,
      notification_type,
      status
    )
    values
      (new.id, 'admin_order_approved', 'pending'),
      (new.id, 'customer_order_approved', 'pending')
    on conflict (order_id, notification_type) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.claim_customer_order_approved_notification(
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
    and notification_type = 'customer_order_approved'
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

revoke execute on function public.claim_customer_order_approved_notification(uuid)
from public, anon, authenticated;

grant execute on function public.claim_customer_order_approved_notification(uuid)
to service_role;
