-- 0073: конструктор витрины v2 (модули A/B/C/D). Добавляем shops.layout jsonb для
-- секций/карточек (объявление, «О магазине», стиль карточек, тумблеры). Цвета/шрифт/
-- скругление и hero-раскладки живут в существующих theme/hero jsonb (без миграции).
-- shop_storefront теперь отдаёт layout наружу. Владелец правит layout как «мягкое» поле
-- (RLS shops_owner_update; guard_shops_update его НЕ ограничивает). Аддитивно.

alter table public.shops add column if not exists layout jsonb not null default '{}'::jsonb;

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
      'layout', s.layout,
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
