-- INKMADE — миграция 0001: ядро каталога (паспорт §5.1, §5.2.1)
-- products / materials / print_zones / variants
-- Ключевое правило (§5.2.1): материал определяет метод печати и тип зон.
--   cotton    -> dtg/dtf -> zonal    (зоны: грудь/спина/рукав)
--   synthetic -> sublimation -> fullprint (одна зона «вся поверхность»)

create extension if not exists pgcrypto;

-- ── Товары (типы изделий) ──────────────────────────────────────────
create table products (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  alias          text unique,                 -- для URL конструктора (§7.1.1)
  title          text not null,
  category       text not null,               -- trikotazh/sport/verhnyaya/golovnye/sumki
  base_price     numeric(12, 2) not null default 0,
  max_size_label text,                         -- макс. размер линейки (напр. '6XL') для DPI-порога
  max_print_mm   jsonb,                        -- {width,height} печати на макс. размере (§10, инвариант DPI)
  description    text,
  is_active      boolean not null default false, -- §8.2.1: черновик по умолчанию
  created_at     timestamptz not null default now()
);

comment on column products.max_print_mm is
  'Физический размер печати на МАКСИМАЛЬНОМ размере изделия — основа DPI-валидации (§10)';

-- ── Материалы изделия (определяют метод и режим печати) ────────────
create table materials (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products (id) on delete cascade,
  name         text not null,                  -- 'Хлопок 100%' / 'Полиэстер'
  fabric_type  text not null check (fabric_type in ('cotton', 'synthetic')),
  print_method text not null check (print_method in ('dtg', 'dtf', 'sublimation')),
  print_mode   text not null check (print_mode in ('zonal', 'fullprint')),
  surcharge    numeric(12, 2) not null default 0
);

create index on materials (product_id);

-- ── Зоны печати (валидны только для своего режима) ─────────────────
create table print_zones (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products (id) on delete cascade,
  print_mode     text not null check (print_mode in ('zonal', 'fullprint')),
  name           text not null,                -- 'chest'/'back'/'sleeve_left'/'fullprint'
  title          text not null,                -- 'Грудь'/'Спина'/'Рукав'/'Вся поверхность'
  bounds_mm      jsonb not null,               -- {x,y,width,height} физические границы зоны
  max_width_mm   numeric(10, 2),
  max_height_mm  numeric(10, 2),
  min_dpi        integer not null default 150,
  placement_hint text,                          -- подсказка размещения (§7.1)
  mockup_url     text
);

create index on print_zones (product_id);

-- ── Варианты (цвет + размер + остаток + материал) ──────────────────
create table variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  material_id uuid not null references materials (id) on delete restrict,
  color_name  text not null,
  color_hex   text not null,                   -- для перекраски превью (§7.1)
  size        text not null,
  stock       integer not null default 0,      -- денормализация; источник истины — stock_movements (§5.3.1)
  sku         text unique not null
);

create index on variants (product_id);
create index on variants (material_id);
