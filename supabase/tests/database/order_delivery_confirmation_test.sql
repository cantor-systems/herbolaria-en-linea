-- Run ONLY through tests/integration/localDeliveryConfirmation.mjs, in its new
-- networkless tmpfs container. The runner supplies synthetic historical rows.
set statement_timeout = '10s';

create function delivery_qa.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;

create function delivery_qa.reject(command text, expected text) returns void
language plpgsql as $$
declare failure text;
begin
  begin
    execute command;
  exception when others then
    get stacked diagnostics failure = message_text;
  end;
  if failure is null or position(expected in failure) = 0 then
    raise exception 'FAIL expected rejection %; got %', expected, failure;
  end if;
end;
$$;
grant usage on schema delivery_qa to service_role;
grant execute on all functions in schema delivery_qa to service_role;

select delivery_qa.assert(not exists (
  select 1 from public.orders o join delivery_qa.historical h using(id)
  where to_jsonb(o) - 'delivered_at' - 'delivery_confirmation_source' <> h.original
     or o.delivered_at is not null or o.delivery_confirmation_source is not null
), 'migration leaves historical orders and timestamps unchanged');
select delivery_qa.assert(not exists (
  (select * from public.order_notifications except select * from delivery_qa.notifications_before)
  union all
  (select * from delivery_qa.notifications_before except select * from public.order_notifications)
), 'migration leaves historical notifications unchanged');

select delivery_qa.assert(has_function_privilege('service_role','public.mark_order_delivered(uuid)','execute'), 'service_role execute');
select delivery_qa.assert(not has_function_privilege('anon','public.mark_order_delivered(uuid)','execute'), 'anon cannot execute');
select delivery_qa.assert(not has_function_privilege('authenticated','public.mark_order_delivered(uuid)','execute'), 'authenticated cannot execute');
select delivery_qa.assert(not exists (
  select 1 from pg_proc p, lateral aclexplode(p.proacl) a
  where p.oid='public.mark_order_delivered(uuid)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'
), 'PUBLIC cannot execute');
select delivery_qa.assert((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid='public.mark_order_delivered(uuid)'::regprocedure), 'invoker and fixed search_path');

set role anon;
do $$
begin
  begin
    perform public.mark_order_delivered('00000000-0000-4000-8000-000000000001');
    raise exception 'FAIL anon unexpectedly executed RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
set role authenticated;
do $$
begin
  begin
    perform public.mark_order_delivered('00000000-0000-4000-8000-000000000001');
    raise exception 'FAIL authenticated unexpectedly executed RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set role service_role;
select delivery_qa.reject($q$select public.mark_order_delivered('00000000-0000-4000-8000-000000000002')$q$, 'order_not_shipped');
select delivery_qa.reject($q$select public.mark_order_delivered('00000000-0000-4000-8000-000000000003')$q$, 'order_not_approved');
select delivery_qa.reject($q$select public.mark_order_delivered('00000000-0000-4000-8000-000000000099')$q$, 'order_not_found');
select delivery_qa.reject($q$update public.orders set fulfillment_status='delivered',delivered_at=now(),delivery_confirmation_source='admin_manual' where id='00000000-0000-4000-8000-000000000002'$q$, 'invalid_fulfillment_transition');

select public.mark_order_shipped('00000000-0000-4000-8000-000000000001', 'Synthetic Courier', 'SYNTHETIC-GUIDE', 'https://tracking.invalid/synthetic');
select delivery_qa.assert((select count(*)=1 from public.order_notifications where order_id='00000000-0000-4000-8000-000000000001' and notification_type='customer_order_shipped_email'), 'one shipment email queued');
select public.mark_order_delivered('00000000-0000-4000-8000-000000000001');
reset role;
create table delivery_qa.confirmed as select * from public.orders where id='00000000-0000-4000-8000-000000000001';
select delivery_qa.assert((select fulfillment_status='delivered' and delivered_at is not null and delivery_confirmation_source='admin_manual' from delivery_qa.confirmed), 'valid pending/shipped/delivered chain');
select delivery_qa.assert((select shipping_carrier='Synthetic Courier' and tracking_number='SYNTHETIC-GUIDE' and tracking_url='https://tracking.invalid/synthetic' and shipped_at is not null from delivery_qa.confirmed), 'shipment intact');

set role service_role;
select public.mark_order_delivered('00000000-0000-4000-8000-000000000001');
select public.mark_order_shipped('00000000-0000-4000-8000-000000000001', 'Synthetic Courier', 'SYNTHETIC-GUIDE', 'https://tracking.invalid/synthetic');
select delivery_qa.reject($q$select public.mark_order_shipped('00000000-0000-4000-8000-000000000001', 'Other Courier', 'SYNTHETIC-GUIDE', 'https://tracking.invalid/synthetic')$q$, 'order_already_shipped_conflict');
select delivery_qa.reject($q$update public.orders set fulfillment_status='pending' where id='00000000-0000-4000-8000-000000000001'$q$, 'fulfillment_status_cannot_revert');
select delivery_qa.reject($q$update public.orders set fulfillment_status='shipped',delivered_at=null,delivery_confirmation_source=null where id='00000000-0000-4000-8000-000000000001'$q$, 'fulfillment_status_cannot_revert');
select delivery_qa.reject($q$update public.orders set fulfillment_status='pending',shipped_at=null where id='00000000-0000-4000-8000-000000000005'$q$, 'fulfillment_status_cannot_revert');
select delivery_qa.reject($q$update public.orders set delivered_at=null where id='00000000-0000-4000-8000-000000000001'$q$, 'orders_delivery_confirmation_check');
select delivery_qa.reject($q$update public.orders set delivery_confirmation_source='carrier_webhook' where id='00000000-0000-4000-8000-000000000001'$q$, 'orders_delivery_confirmation_check');
reset role;
select delivery_qa.assert((select to_jsonb(o)=to_jsonb(c) from public.orders o join delivery_qa.confirmed c using(id)), 'repeat delivery and shipment preserve entire row including timestamps');
select delivery_qa.assert((select count(*)=1 from public.order_notifications where order_id='00000000-0000-4000-8000-000000000001'), 'delivery and repeats enqueue no additional notifications');
select delivery_qa.assert(not exists(select 1 from public.payment_events), 'no payment events generated');
select delivery_qa.assert(not exists (
  select 1 from public.orders o join delivery_qa.historical h using(id)
  where o.status <> h.original->>'status' or o.total_cents <> (h.original->>'total_cents')::bigint
    or o.mercadopago_payment_id <> h.original->>'mercadopago_payment_id'
), 'payment status, amounts and IDs preserved');

-- Historical failed shipping email remains claimable after manual delivery.
set role service_role;
select public.mark_order_delivered('00000000-0000-4000-8000-000000000005');
select delivery_qa.assert((select attempts=2 and status='processing' from public.claim_customer_order_shipped_email_notification('00000000-0000-4000-8000-000000000005')), 'email retry after delivery');
select public.mark_order_notification_sent(id,attempts) from public.order_notifications where order_id='00000000-0000-4000-8000-000000000005';
select delivery_qa.assert((select count(*)=0 from public.claim_customer_order_shipped_email_notification('00000000-0000-4000-8000-000000000005')), 'sent email is not reclaimed');
select public.mark_whatsapp_shipping_notified('00000000-0000-4000-8000-000000000001');
reset role;
create table delivery_qa.whatsapp as select * from public.orders where id='00000000-0000-4000-8000-000000000001';
set role service_role;
select public.mark_whatsapp_shipping_notified('00000000-0000-4000-8000-000000000001');
select public.mark_order_delivered('00000000-0000-4000-8000-000000000007');
select public.mark_order_delivered('00000000-0000-4000-8000-000000000008');
select delivery_qa.reject($q$select public.mark_whatsapp_shipping_notified('00000000-0000-4000-8000-000000000007')$q$, 'whatsapp_notifications_not_authorized');
select delivery_qa.reject($q$select public.mark_whatsapp_shipping_notified('00000000-0000-4000-8000-000000000008')$q$, 'customer_phone_missing');
reset role;
select delivery_qa.assert((select to_jsonb(o)=to_jsonb(w) from public.orders o join delivery_qa.whatsapp w using(id)), 'manual WhatsApp repeat preserves timestamps');
select delivery_qa.assert((select o.delivered_at=c.delivered_at and o.shipped_at=c.shipped_at and o.tracking_number=c.tracking_number from public.orders o join delivery_qa.confirmed c using(id)), 'manual WhatsApp preserves delivery/shipment');
select delivery_qa.assert((select to_jsonb(o)-'delivered_at'-'delivery_confirmation_source'=h.original from public.orders o join delivery_qa.historical h using(id) where o.id='00000000-0000-4000-8000-000000000006'), 'untouched pending history remains pending');

select 'PASS: historical compatibility, full transition, rejection, idempotency, reversal/skip protection, preserved shipment/payment, RPC permissions, email claim and manual WhatsApp.';
