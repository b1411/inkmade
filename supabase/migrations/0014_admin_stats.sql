-- INKMADE — миграция 0014: агрегаты для дашборда админа (аудит M12, §8.2.5)
-- Один round-trip: выручка, заказы по статусам, топ товаров, доля брака.
-- SECURITY DEFINER + проверка роли admin внутри.

create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from public.orders where paid_at is not null), 0),
    'orders_total', (select count(*) from public.orders),
    'paid_orders', (select count(*) from public.orders where paid_at is not null),
    'by_status', coalesce(
      (select jsonb_object_agg(status, c) from (
        select status, count(*) c from public.orders group by status
      ) s), '{}'::jsonb),
    'reprints', (select count(distinct order_id) from public.order_status_log where to_status = 'reprint'),
    'top_products', coalesce(
      (select jsonb_agg(t) from (
        select p.title, sum(oi.quantity)::int as qty
        from public.order_items oi
        join public.designs d on d.id = oi.design_id
        join public.products p on p.id = d.product_id
        group by p.title order by qty desc limit 5
      ) t), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
