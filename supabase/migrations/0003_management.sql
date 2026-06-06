-- INKMADE — миграция 0003: управление и прослеживаемость (паспорт §5.3.1, §8)
-- profiles / order_status_log / product_images / stock_movements / print_library

-- ── Профили с ролью (роль определяет доступ к кабинетам, §8.1) ──────
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'customer' check (role in ('customer', 'operator', 'admin')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- Авто-создание профиля при регистрации (роль по умолчанию customer).
-- Смена роли — только admin (§5.4), не self-service.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Лог переходов статуса заказа — сквозная прослеживаемость (§5.3) ─
create table order_status_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders (id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_id    uuid references auth.users (id) on delete set null,
  note        text,                             -- причина/комментарий (брак, пауза)
  created_at  timestamptz not null default now()
);

create index on order_status_log (order_id);

-- ── Фото товара для каталога ───────────────────────────────────────
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url        text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0
);

create index on product_images (product_id);

-- ── Движения склада заготовок (источник истины остатков, §5.3.1) ───
create table stock_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variants (id) on delete cascade,
  delta      integer not null,                  -- +приход / -расход
  reason     text not null check (reason in ('purchase', 'order', 'correction', 'defect')),
  order_id   uuid references orders (id) on delete set null,
  actor_id   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on stock_movements (variant_id);

-- ── Библиотека готовых принтов (второй канал продаж, §11.1) ────────
create table print_library (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  file_url      text not null,
  thumbnail_url text,
  author        text,
  royalty_pct   numeric(5, 2) not null default 0,
  tags          text[] not null default '{}',
  is_active     boolean not null default true
);
