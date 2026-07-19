-- 0092: точное время нахождения заказа в текущем производственном статусе.
-- Очередь остаётся безопасной для оператора: финансовые поля не возвращаются.

drop function if exists public.studio_list_queue();
create or replace function public.studio_list_queue()
returns table (
  id                uuid,
  status            text,
  created_at        timestamptz,
  status_changed_at timestamptz,
  tracking_no       text,
  carrier           text,
  item_count        bigint,
  customer_name     text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.status,
    o.created_at,
    coalesce(
      (
        select max(l.created_at)
        from public.order_status_log l
        where l.order_id = o.id and l.to_status = o.status
      ),
      o.paid_at,
      o.created_at
    ) as status_changed_at,
    o.tracking_no,
    o.carrier,
    (select count(*) from public.order_items oi where oi.order_id = o.id) as item_count,
    coalesce(
      o.shipping_addr ->> 'name',
      o.shipping_addr ->> 'full_name',
      pr.full_name
    ) as customer_name
  from public.orders o
  left join public.profiles pr on pr.id = o.user_id
  where private.is_staff() and o.paid_at is not null
  order by status_changed_at desc;
$$;

revoke all on function public.studio_list_queue() from public, anon;
grant execute on function public.studio_list_queue() to authenticated;
