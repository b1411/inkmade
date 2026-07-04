-- 0074: аналитика витрины B2B-магазина (модуль F). События витрины (просмотр/просмотр
-- товара/в корзину) пишет аноним через SECURITY DEFINER RPC (прямая вставка запрещена RLS,
-- как shop_applications). Владелец видит агрегаты через shop_analytics. Продажи берём из
-- order_items.shop_id (уже есть). Аддитивно.

create table if not exists public.shop_events (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  type       text not null check (type in ('view', 'item_view', 'add_to_cart')),
  item_id    uuid references public.shop_items (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shop_events_shop_idx on public.shop_events (shop_id, created_at desc);
create index if not exists shop_events_item_idx on public.shop_events (item_id) where item_id is not null;

alter table public.shop_events enable row level security;
-- прямой вставки/чтения анониму нет: пишет shop_track (definer), читает shop_analytics (definer).
-- Владелец/админ могут читать сырые события своего магазина (на будущее/отладку).
create policy shop_events_owner_read on public.shop_events for select
  using (exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())));

-- ── Запись события витрины (аноним/юзер). Тихо игнорирует мусор, чтобы не ронять витрину ──
create or replace function public.shop_track(p_shop_id uuid, p_type text, p_item_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_type not in ('view', 'item_view', 'add_to_cart') then return; end if;
  -- событие пишем только для активной публичной витрины
  if not exists (select 1 from public.shops where id = p_shop_id and status = 'active' and is_public = true) then
    return;
  end if;
  -- позиция должна принадлежать этому магазину, иначе просто не привязываем item
  if p_item_id is not null and not exists (
    select 1 from public.shop_items where id = p_item_id and shop_id = p_shop_id
  ) then
    p_item_id := null;
  end if;
  insert into public.shop_events (shop_id, type, item_id) values (p_shop_id, p_type, p_item_id);
end;
$$;
revoke all on function public.shop_track(uuid, text, uuid) from public;
grant execute on function public.shop_track(uuid, text, uuid) to anon, authenticated;

-- ── Агрегаты для владельца: события за N дней + продажи (order_items.shop_id) ──
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

  select count(distinct o.id), coalesce(sum(oi.unit_price * oi.quantity), 0)
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
