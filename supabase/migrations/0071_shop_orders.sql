-- 0071: заказы владельца магазина (Tier1 B). Владелец видел только сумму начислений,
-- но не сами продажи. order_items/orders закрыты RLS покупателя → отдаём через
-- SECURITY DEFINER RPC ТОЛЬКО позиции своего магазина (по order_items.shop_id), с
-- минимумом PII покупателя (имя+город из shipping_addr). Аддитивно.

create or replace function public.shop_orders(p_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  -- доступ только владельцу магазина или админу
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
        (select coalesce(sum(oi.unit_price * oi.quantity), 0)
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
              'line_total', oi.unit_price * oi.quantity
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
