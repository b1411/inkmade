-- 0029: оператор не видит финансы (§5.2). RLS построчный, не поколоночный —
-- поэтому доступ оператора к заказам идёт через SECURITY DEFINER RPC, которые
-- отдают ТОЛЬКО производственные поля (без total/unit_price/unit_cost), а прямое
-- чтение order_items закрывается до admin (там лежат unit_cost/unit_price — маржа).

-- ── 1. order_items: прямое чтение только admin (operator теряет доступ к ценам) ──
-- Владелец заказа продолжает читать свои позиции (order_items_owner_read из 0004).
-- Оператор получает позиции исключительно через studio_get_order ниже.
drop policy if exists order_items_staff_read on public.order_items;
create policy order_items_admin_read on public.order_items for select
  using (private.is_admin());

-- ── 2. Очередь цеха: только производственно-безопасные колонки, без сумм ──
create or replace function public.studio_list_queue()
returns table (
  id          uuid,
  status      text,
  created_at  timestamptz,
  tracking_no text,
  carrier     text,
  item_count  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id, o.status, o.created_at, o.tracking_no, o.carrier,
    (select count(*) from public.order_items oi where oi.order_id = o.id) as item_count
  from public.orders o
  where private.is_staff() and o.paid_at is not null
  order by o.created_at asc;
$$;

-- ── 3. Карточка заказа для цеха: спецификация, заготовка, метод — без денег ──
create or replace function public.studio_get_order(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.is_staff() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'created_at', o.created_at,
    'tracking_no', o.tracking_no,
    'carrier', o.carrier,
    'shipping_addr', o.shipping_addr,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'print_method', oi.print_method,
        'designs', (
          select jsonb_build_object(
            'id', d.id,
            'spec', d.spec,
            'original_url', d.original_url,
            'preview_url', d.preview_url,
            'moderation_status', d.moderation_status
          )
          from public.designs d where d.id = oi.design_id
        ),
        'variants', (
          select jsonb_build_object(
            'color_name', v.color_name,
            'color_hex', v.color_hex,
            'size', v.size,
            'sku', v.sku,
            'products', (select jsonb_build_object('title', p.title) from public.products p where p.id = v.product_id),
            'materials', (
              select jsonb_build_object('name', m.name, 'print_method', m.print_method, 'print_mode', m.print_mode)
              from public.materials m where m.id = v.material_id
            )
          )
          from public.variants v where v.id = oi.variant_id
        )
      ))
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'order_status_log', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'from_status', l.from_status,
        'to_status', l.to_status,
        'note', l.note,
        'created_at', l.created_at
      ) order by l.created_at)
      from public.order_status_log l where l.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders o
  where o.id = p_id and o.paid_at is not null;

  if v_result is null then
    raise exception 'not found';
  end if;

  return v_result;
end;
$$;

-- доступ только вошедшим (роль проверяется внутри через is_staff); anon не вызывает
revoke all on function public.studio_list_queue() from public, anon;
revoke all on function public.studio_get_order(uuid) from public, anon;
grant execute on function public.studio_list_queue() to authenticated;
grant execute on function public.studio_get_order(uuid) to authenticated;
