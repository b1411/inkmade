-- 0070: выбор размера/цвета на витрине B2B-магазина (Tier1 A).
-- Позиция витрины была привязана к одному варианту (размер+цвет из дизайна) — покупатель
-- не мог выбрать размер. Теперь витрина отдаёт варианты того же продукта+материала
-- (метод печати/зоны остаются валидными; цену владелец задаёт единую на позицию), а
-- shop_item_buy_payload принимает выбранный variant_id и валидирует принадлежность (сиблинг).
-- Превью остаётся дизайн-мокапом владельца (цвет-свотч меняет заготовку, не мокап). Аддитивно.

-- shop_storefront: + per-item список вариантов (size/color/in_stock) и default_variant_id.
create or replace function public.shop_storefront(p_slug text, p_code text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s public.shops;
  v_locked boolean;
begin
  select * into s from public.shops
    where slug = p_slug and status = 'active' and is_public = true;
  if not found then
    return null;
  end if;

  v_locked := s.access_code is not null and (p_code is null or p_code <> s.access_code);

  return jsonb_build_object(
    'shop', jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name,
      'logo_url', s.logo_url, 'theme', s.theme, 'hero', s.hero, 'contacts', s.contacts,
      'closed_mode', s.access_code is not null
    ),
    'closed', v_locked,
    'items', case when v_locked then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'title', i.title, 'description', i.description,
        'preview_url', i.preview_url, 'price', i.price + i.markup,
        'design_id', i.design_id, 'product_id', i.product_id, 'variant_id', i.variant_id,
        'default_variant_id', bv.id,
        'variants', coalesce(sib.variants, '[]'::jsonb)
      ) order by i.sort, i.created_at)
      from public.shop_items i
      left join public.designs d on d.id = i.design_id
      left join public.variants bv on bv.id = coalesce(d.variant_id, i.variant_id)
      left join lateral (
        select jsonb_agg(jsonb_build_object(
          'id', vv.id, 'color_name', vv.color_name, 'color_hex', vv.color_hex,
          'size', vv.size, 'in_stock', vv.stock > 0
        ) order by vv.color_name, vv.size) as variants
        from public.variants vv
        where bv.id is not null
          and vv.product_id = bv.product_id and vv.material_id = bv.material_id
      ) sib on true
      where i.shop_id = s.id and i.is_active = true
    ), '[]'::jsonb) end
  );
end;
$$;
revoke all on function public.shop_storefront(text, text) from public, anon, authenticated;
grant execute on function public.shop_storefront(text, text) to anon, authenticated;

-- shop_item_buy_payload: + выбранный variant_id (валидируется как сиблинг product+material).
-- Старая 2-арг сигнатура удаляется, чтобы не было overload-неоднозначности в PostgREST.
drop function if exists public.shop_item_buy_payload(uuid, text);
create or replace function public.shop_item_buy_payload(p_item_id uuid, p_code text default null, p_variant_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  it public.shop_items;
  s  public.shops;
  d  public.designs;
  p  public.products;
  v_base public.variants;
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

  select * into v_base from public.variants where id = coalesce(d.variant_id, it.variant_id);
  if not found then return null; end if;

  -- покупатель выбрал конкретный вариант (размер/цвет) — валидируем как сиблинг того же
  -- продукта и материала (метод печати обязан совпасть). Иначе — недопустимый выбор.
  if p_variant_id is not null and p_variant_id <> v_base.id then
    select * into v from public.variants
      where id = p_variant_id and product_id = v_base.product_id and material_id = v_base.material_id;
    if not found then return null; end if;
  else
    v := v_base;
  end if;

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
revoke all on function public.shop_item_buy_payload(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.shop_item_buy_payload(uuid, text, uuid) to anon, authenticated;
