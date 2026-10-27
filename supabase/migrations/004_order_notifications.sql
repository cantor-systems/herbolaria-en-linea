create table public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_type text not null
    check (notification_type in ('admin_order_approved')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, notification_type)
);

create index order_notifications_status_updated_at_idx
  on public.order_notifications (status, updated_at);

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
    values (
      new.id,
      'admin_order_approved',
      'pending'
    )
    on conflict (order_id, notification_type) do nothing;
  end if;

  return new;
end;
$$;

create trigger enqueue_admin_order_approved_notification
after update of status on public.orders
for each row
execute function public.enqueue_admin_order_approved_notification();

create or replace function public.claim_admin_order_approved_notification(
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
    and notification_type = 'admin_order_approved'
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

create or replace function public.mark_order_notification_sent(
  p_notification_id uuid,
  p_attempt integer
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
    status = 'sent',
    last_error = null,
    sent_at = now(),
    updated_at = now()
  where id = p_notification_id
    and status = 'processing'
    and attempts = p_attempt
  returning *;
end;
$$;

create or replace function public.mark_order_notification_failed(
  p_notification_id uuid,
  p_attempt integer,
  p_last_error text
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
    status = 'failed',
    last_error = left(coalesce(nullif(p_last_error, ''), 'notification_failed'), 200),
    updated_at = now()
  where id = p_notification_id
    and status = 'processing'
    and attempts = p_attempt
  returning *;
end;
$$;

alter table public.order_notifications enable row level security;

revoke all on table public.order_notifications from public, anon, authenticated;
grant all on table public.order_notifications to service_role;

revoke execute on function public.enqueue_admin_order_approved_notification() from public, anon, authenticated;
revoke execute on function public.claim_admin_order_approved_notification(uuid) from public, anon, authenticated;
revoke execute on function public.mark_order_notification_sent(uuid, integer) from public, anon, authenticated;
revoke execute on function public.mark_order_notification_failed(uuid, integer, text) from public, anon, authenticated;

grant execute on function public.claim_admin_order_approved_notification(uuid) to service_role;
grant execute on function public.mark_order_notification_sent(uuid, integer) to service_role;
grant execute on function public.mark_order_notification_failed(uuid, integer, text) to service_role;
