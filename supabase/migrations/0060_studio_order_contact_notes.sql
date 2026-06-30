-- 0060: производственный кабинет (Фаза O1) — контакты клиента в очереди + внутренние заметки.
-- Аддитивно и идемпотентно. Три части:
--   1) orders.internal_notes — свободные внутренние заметки цеха (НЕ финансовое поле,
--      поэтому guard_orders_update (0057) пропускает прямой operator-UPDATE; читаем через RPC).
--   2) studio_list_queue — добавляем customer_name (имя клиента на карточках очереди).
--   3) studio_get_order — добавляем internal_notes (контакты/адрес уже отдаются в shipping_addr).

-- ── 1. Колонка внутренних заметок ───────────────────────────────────
alter table public.orders add column if not exists internal_notes text;

-- ── 2. Очередь цеха: + имя клиента (из адреса доставки или профиля) ──
-- DROP перед CREATE: меняется набор OUT-колонок (+customer_name), create or replace недостаточно.
drop function if exists public.studio_list_queue();
create or replace function public.studio_list_queue()
returns table (
  id            uuid,
  status        text,
  created_at    timestamptz,
  tracking_no   text,
  carrier       text,
  item_count    bigint,
  customer_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id, o.status, o.created_at, o.tracking_no, o.carrier,
    (select count(*) from public.order_items oi where oi.order_id = o.id) as item_count,
    coalesce(
      o.shipping_addr ->> 'name',
      o.shipping_addr ->> 'full_name',
      pr.full_name
    ) as customer_name
  from public.orders o
  left join public.profiles pr on pr.id = o.user_id
  where private.is_staff() and o.paid_at is not null
  order by o.created_at asc;
$$;

-- ── 3. Карточка заказа: + internal_notes (без денег, прежняя проекция) ──
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
    'internal_notes', o.internal_notes,
    'is_gift', o.is_gift,
    'gift_recipient', o.gift_recipient,
    'gift_message', o.gift_message,
    'gift_hide_price', o.gift_hide_price,
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

-- права: как в 0029 (доступ только authenticated; роль проверяется внутри через is_staff)
revoke all on function public.studio_list_queue() from public, anon;
revoke all on function public.studio_get_order(uuid) from public, anon;
grant execute on function public.studio_list_queue() to authenticated;
grant execute on function public.studio_get_order(uuid) to authenticated;
