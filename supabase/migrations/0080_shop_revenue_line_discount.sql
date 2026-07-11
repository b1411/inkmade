-- 0080: корректный учёт скидки магазина (line_discount) в витринах владельца.
--
-- ПРОБЛЕМА (аудит 2026-07-11): shop_orders и shop_analytics считали выручку как
-- sum(unit_price * quantity) и НЕ вычитали line_discount — скидку собственного
-- промокода, которую владелец сам абсорбирует. Итог: «Продано»/revenue завышены
-- на Σ line_discount. При этом ЗАРАБОТОК (shop_earnings/balances) считался верно
-- (apply_paid 0075:204 уже вычитает line_discount), расходились только read-показы.
--
-- ФИКС: чистая выручка позиции = unit_price*quantity − coalesce(line_discount,0).
-- Меняются ТОЛЬКО два read-only SECURITY DEFINER RPC (repro из 0071/0074 дословно,
-- изменены только арифметика subtotal/line_total/revenue). Аддитивно, без схемы.

-- ── shop_orders: subtotal и line_total за вычетом line_discount ──
create or replace function public.shop_orders(p_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.shops s
    where s.id = p_shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ) then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(o) order by o.created_at desc)
    from (
      select
        ord.id,
        ord.created_at,
        ord.status,
        (ord.paid_at is not null) as paid,
        nullif(ord.shipping_addr ->> 'name', '') as buyer_name,
        nullif(ord.shipping_addr ->> 'city', '') as city,
        (select coalesce(sum(oi.unit_price * oi.quantity - coalesce(oi.line_discount, 0)), 0)
           from public.order_items oi
           where oi.order_id = ord.id and oi.shop_id = p_shop_id) as subtotal,
        (select coalesce(sum(se.amount), 0)
           from public.shop_earnings se
           where se.order_id = ord.id and se.shop_id = p_shop_id) as earned,
        (select jsonb_agg(jsonb_build_object(
              'title', pr.title,
              'color_name', vv.color_name,
              'size', vv.size,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'line_total', oi.unit_price * oi.quantity - coalesce(oi.line_discount, 0)
            ) order by pr.title)
           from public.order_items oi
           left join public.variants vv on vv.id = oi.variant_id
           left join public.products pr on pr.id = vv.product_id
           where oi.order_id = ord.id and oi.shop_id = p_shop_id) as items
      from public.orders ord
      where exists (
        select 1 from public.order_items oi
        where oi.order_id = ord.id and oi.shop_id = p_shop_id
      )
      order by ord.created_at desc
      limit 200
    ) o
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.shop_orders(uuid) from public, anon, authenticated;
grant execute on function public.shop_orders(uuid) to authenticated;

-- ── shop_analytics: revenue за вычетом line_discount ──
create or replace function public.shop_analytics(p_shop_id uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := now() - (greatest(1, least(p_days, 365)) || ' days')::interval;
  v_views int; v_item_views int; v_adds int; v_orders int; v_revenue numeric;
  v_daily jsonb; v_top jsonb;
begin
  if not exists (
    select 1 from public.shops s
    where s.id = p_shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ) then
    raise exception 'forbidden';
  end if;

  select
    count(*) filter (where type = 'view'),
    count(*) filter (where type = 'item_view'),
    count(*) filter (where type = 'add_to_cart')
    into v_views, v_item_views, v_adds
  from public.shop_events where shop_id = p_shop_id and created_at >= v_from;

  select count(distinct o.id), coalesce(sum(oi.unit_price * oi.quantity - coalesce(oi.line_discount, 0)), 0)
    into v_orders, v_revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.shop_id = p_shop_id and o.paid_at is not null and o.paid_at >= v_from;

  select coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', c) order by d), '[]'::jsonb)
    into v_daily
  from (
    select date_trunc('day', created_at)::date as d, count(*) as c
    from public.shop_events
    where shop_id = p_shop_id and type = 'view' and created_at >= v_from
    group by 1
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'views', t.views, 'adds', t.adds
    ) order by t.views desc, t.adds desc), '[]'::jsonb)
    into v_top
  from (
    select i.id, i.title,
      count(*) filter (where e.type = 'item_view') as views,
      count(*) filter (where e.type = 'add_to_cart') as adds
    from public.shop_items i
    left join public.shop_events e on e.item_id = i.id and e.created_at >= v_from
    where i.shop_id = p_shop_id
    group by i.id, i.title
    having count(e.id) > 0
    order by views desc, adds desc
    limit 5
  ) t;

  return jsonb_build_object(
    'views', v_views, 'itemViews', v_item_views, 'addToCart', v_adds,
    'orders', v_orders, 'revenue', v_revenue,
    'daily', v_daily, 'topItems', v_top
  );
end;
$$;
revoke all on function public.shop_analytics(uuid, int) from public, anon, authenticated;
grant execute on function public.shop_analytics(uuid, int) to authenticated;
