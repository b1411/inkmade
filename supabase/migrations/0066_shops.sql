-- 0066: ядро B2B-магазинов (Фаза B2) — таблицы shops/shop_items + атрибуция + RPC.
-- Магазин = обычный customer-владелец (shops.owner_id) + брендированная витрина.
-- Публичная витрина отдаётся через SECURITY DEFINER RPC shop_storefront (в обход RLS,
-- как public_designer_profile/studio_* — паттерн задокументирован в 0042/0058), чтобы
-- НЕ светить access_code/приватные поля анониму. Создание магазина из заявки — admin RPC.
-- Аддитивно, идемпотентно. Домен ещё не куплен → витрина по пути /s/<slug> (см. docs/B2B_SHOPS_PLAN.md).

-- ── Зарезервированные slug'и (совпадают с системными путями/поддоменами) ──
create or replace function public.is_reserved_shop_slug(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select p_slug in (
    'www', 'api', 'admin', 'studio', 'studio-designer', 'designer', 'app', 'mail',
    'shop', 'shops', 'cdn', 'static', 'assets', 'account', 'business', 'catalog',
    'cart', 'checkout', 'login', 'logout', 'order', 'orders', 'customize', 'invite',
    's', 'auth', 'blog', 'help', 'support', 'about', 'inkmade'
  );
$$;

-- ── shops ────────────────────────────────────────────────────────────────
create table if not exists public.shops (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                      constraint shops_slug_format
                      check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  name              text not null,
  status            text not null default 'active' check (status in ('active', 'suspended')),
  owner_id          uuid references auth.users (id) on delete set null,
  application_id    uuid references public.shop_applications (id) on delete set null,
  logo_url          text,
  theme             jsonb not null default '{}'::jsonb,  -- {primary, bg, accent}
  hero              jsonb not null default '{}'::jsonb,  -- {title, subtitle, banner_url}
  contacts          jsonb not null default '{}'::jsonb,  -- {instagram, phone, whatsapp}
  revenue_share_pct numeric not null default 0 check (revenue_share_pct >= 0 and revenue_share_pct <= 100),
  access_code       text,                                -- закрытый стор: null = открытый
  is_public         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists shops_owner_idx on public.shops (owner_id);
create index if not exists shops_status_idx on public.shops (status) where status = 'active';

-- ── shop_items (витрина: композиция из конструктора + снапшот для отображения) ──
create table if not exists public.shop_items (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  design_id   uuid references public.designs (id) on delete set null,
  product_id  uuid references public.products (id) on delete set null,
  variant_id  uuid references public.variants (id) on delete set null,
  title       text not null,
  description text,
  preview_url text,
  price       numeric not null default 0 check (price >= 0),
  markup      numeric not null default 0 check (markup >= 0),  -- наценка владельца (v2)
  sort        int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists shop_items_shop_idx on public.shop_items (shop_id, sort);
create index if not exists shop_items_design_idx on public.shop_items (design_id);

-- ── Атрибуция магазину (денормализация, заполняет сервер; для отчётности/роялти B4) ──
alter table public.print_library add column if not exists shop_id uuid references public.shops (id) on delete set null;
alter table public.order_items   add column if not exists shop_id uuid references public.shops (id) on delete set null;
create index if not exists print_library_shop_idx on public.print_library (shop_id);
create index if not exists order_items_shop_idx on public.order_items (shop_id);

-- ── RLS: shops ─────────────────────────────────────────────────────────────
alter table public.shops enable row level security;
-- владелец видит/правит свой магазин; админ — все. Аноним читает ТОЛЬКО через RPC.
create policy shops_owner_read on public.shops for select
  using (owner_id = (select auth.uid()) or private.is_admin());
create policy shops_owner_update on public.shops for update
  using (owner_id = (select auth.uid()) or private.is_admin())
  with check (owner_id = (select auth.uid()) or private.is_admin());
create policy shops_admin_insert on public.shops for insert with check (private.is_admin());
create policy shops_admin_delete on public.shops for delete using (private.is_admin());

-- Иммутабельность slug/owner/status/revenue_share/application для НЕ-админа (owner-UPDATE).
create or replace function public.guard_shops_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    if new.slug is distinct from old.slug
       or new.owner_id is distinct from old.owner_id
       or new.status is distinct from old.status
       or new.revenue_share_pct is distinct from old.revenue_share_pct
       or new.application_id is distinct from old.application_id then
      raise exception 'slug/owner/status/revenue_share магазина меняет только админ';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_shops_update() from public, anon, authenticated;
drop trigger if exists trg_guard_shops_update on public.shops;
create trigger trg_guard_shops_update before update on public.shops
  for each row execute function public.guard_shops_update();

-- ── RLS: shop_items ────────────────────────────────────────────────────────
alter table public.shop_items enable row level security;
-- владелец магазина (или админ) — полный CRUD своих позиций. Аноним — через RPC.
create policy shop_items_owner_all on public.shop_items for all
  using (exists (
    select 1 from public.shops s
    where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ))
  with check (exists (
    select 1 from public.shops s
    where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ));

-- ── Публичная витрина (в обход RLS; access_code/приватные поля наружу НЕ уходят) ──
-- Возвращает json: { shop:{...}, items:[...], closed:bool } либо null, если магазин
-- не найден/не активен/скрыт. Закрытый стор (access_code) при неверном коде отдаёт
-- брендинг + closed=true, но без позиций.
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
        'design_id', i.design_id, 'product_id', i.product_id, 'variant_id', i.variant_id
      ) order by i.sort, i.created_at)
      from public.shop_items i
      where i.shop_id = s.id and i.is_active = true
    ), '[]'::jsonb) end
  );
end;
$$;
revoke all on function public.shop_storefront(text, text) from public, anon, authenticated;
grant execute on function public.shop_storefront(text, text) to anon, authenticated;

-- ── Admin: создать магазин из заявки (валидирует slug, линкует заявку, ставит approved) ──
-- owner_id резолвится по email заявителя, если такой пользователь уже есть (иначе null —
-- привяжем при claim в B3). Возвращает json {id, slug}.
create or replace function public.admin_create_shop(
  p_app_id uuid, p_slug text, p_name text, p_revenue_share numeric default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.shop_applications;
  v_slug text := lower(trim(p_slug));
  v_owner uuid;
  v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into a from public.shop_applications where id = p_app_id;
  if not found then
    raise exception 'заявка не найдена';
  end if;
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'некорректный slug';
  end if;
  if public.is_reserved_shop_slug(v_slug) then
    raise exception 'slug зарезервирован';
  end if;
  if exists (select 1 from public.shops where slug = v_slug) then
    raise exception 'slug занят';
  end if;

  select id into v_owner from auth.users where lower(email) = lower(a.email) limit 1;

  insert into public.shops (slug, name, owner_id, application_id, revenue_share_pct, contacts)
  values (
    v_slug, coalesce(nullif(trim(p_name), ''), a.org_name), v_owner, a.id,
    coalesce(p_revenue_share, 0),
    jsonb_build_object('phone', a.phone)
  )
  returning id into v_id;

  update public.shop_applications
    set status = 'approved', resolved_at = now(), resolved_by = (select auth.uid())
    where id = p_app_id and status = 'pending';

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;
revoke all on function public.admin_create_shop(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.admin_create_shop(uuid, text, text, numeric) to authenticated;

-- Admin: список магазинов для админки (владелец-email через join auth.users не нужен здесь).
create or replace function public.admin_list_shops()
returns setof public.shops language sql stable security definer set search_path = '' as $$
  select * from public.shops
  where private.is_admin()
  order by created_at desc;
$$;
revoke all on function public.admin_list_shops() from public, anon, authenticated;
grant execute on function public.admin_list_shops() to authenticated;
