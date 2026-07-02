-- 0067: buy-flow витрины магазина (Фаза B3.2) — покупка позиции витрины.
-- Покупатель кладёт shop_item в корзину; серверу для сборки позиции корзины нужны
-- product/variant/spec ВЛАДЕЛЬЦА (RLS покупателя к чужому design не пускает) → отдаём
-- через SECURITY DEFINER RPC. Атрибуция магазину: cart_items.shop_item_id → сервер
-- проставляет order_items.shop_id при создании заказа (авторитетно, не с клиента).
-- Аддитивно, идемпотентно.

alter table public.cart_items
  add column if not exists shop_item_id uuid references public.shop_items (id) on delete set null;

-- Полезная нагрузка для «в корзину»: собирает позицию из shop_item→design→product→variant.
-- Возвращает null, если магазин не активен/скрыт, позиция не активна, либо закрытый
-- стор без верного кода. НЕ отдаёт access_code и данные других магазинов.
create or replace function public.shop_item_buy_payload(p_item_id uuid, p_code text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  it public.shop_items;
  s  public.shops;
  d  public.designs;
  p  public.products;
  v  public.variants;
  m  public.materials;
begin
  select * into it from public.shop_items where id = p_item_id and is_active = true;
  if not found then return null; end if;

  select * into s from public.shops
    where id = it.shop_id and status = 'active' and is_public = true;
  if not found then return null; end if;

  if s.access_code is not null and (p_code is null or p_code <> s.access_code) then
    return null;  -- закрытый стор без верного кода
  end if;

  if it.design_id is not null then
    select * into d from public.designs where id = it.design_id;
  end if;

  select * into p from public.products where id = coalesce(d.product_id, it.product_id) and is_active = true;
  if not found then return null; end if;
  select * into v from public.variants where id = coalesce(d.variant_id, it.variant_id);
  if not found then return null; end if;
  select * into m from public.materials where id = v.material_id;

  return jsonb_build_object(
    'shopItemId', it.id,
    'shopId', s.id,
    'productId', p.id,
    'slug', p.slug,
    'alias', p.alias,
    'title', it.title,
    'variantId', v.id,
    'colorName', v.color_name,
    'colorHex', v.color_hex,
    'size', v.size,
    'printMethod', m.print_method,
    'spec', coalesce(d.spec, '{}'::jsonb),
    'unitPrice', it.price + it.markup,
    'previewUrl', coalesce(it.preview_url, d.preview_url)
  );
end;
$$;
revoke all on function public.shop_item_buy_payload(uuid, text) from public, anon, authenticated;
grant execute on function public.shop_item_buy_payload(uuid, text) to anon, authenticated;
