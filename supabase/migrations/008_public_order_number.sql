BEGIN;

alter table public.orders
add column if not exists public_order_number text;

alter table public.orders
add constraint orders_public_order_number_unique unique (public_order_number);

create or replace function public.generate_public_order_number()
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_candidate text;
  v_position integer;
begin
  for v_attempt in 1..50 loop
    v_candidate := '';

    for v_position in 1..6 loop
      v_candidate := v_candidate || substr(
        v_alphabet,
        floor(random() * char_length(v_alphabet))::integer + 1,
        1
      );
    end loop;

    if not exists (
      select 1
      from public.orders
      where public_order_number = v_candidate
    ) then
      return v_candidate;
    end if;
  end loop;

  raise exception 'public_order_number_generation_exhausted';
end;
$$;

revoke execute on function public.generate_public_order_number()
from public, anon, authenticated;

grant execute on function public.generate_public_order_number()
to service_role;

alter table public.orders
alter column public_order_number set default public.generate_public_order_number();

do $$
declare
  v_order_id public.orders.id%type;
begin
  for v_order_id in
    select id
    from public.orders
    where public_order_number is null
    order by id
  loop
    update public.orders
    set public_order_number = public.generate_public_order_number()
    where id = v_order_id
      and public_order_number is null;
  end loop;
end;
$$;

alter table public.orders
add constraint orders_public_order_number_format_check check (
  public_order_number ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
);

alter table public.orders
alter column public_order_number set not null;

COMMIT;
