-- INKMADE — миграция 0002: дизайны и заказы (паспорт §5.1, §5.2, §5.3)
-- designs / orders / order_items / payments

-- ── Дизайны пользователя ───────────────────────────────────────────
create table designs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  product_id     uuid not null references products (id) on delete restrict,
  variant_id     uuid references variants (id) on delete set null,
  original_url   text,                          -- оригинал в приватном Storage
  print_file_url text,                          -- собранный печатный файл (null до производства, §7.2)
  spec           jsonb not null default '{}'::jsonb, -- спецификация нанесения (§5.2)
  preview_url    text,
  is_saved       boolean not null default false,    -- сохранён в кабинете (§11.1)
  share_token    text unique,                       -- шаринг по ссылке (§9.1)
  created_at     timestamptz not null default now()
);

create index on designs (user_id);
create index on designs (product_id);

comment on column designs.spec is
  'Спецификация нанесения в мм (§5.2): placements[{zone,x_mm,y_mm,width_mm,height_mm,rotation_deg,...}]. Без мм-привязки цех не воспроизведёт макет.';

-- ── Заказы ─────────────────────────────────────────────────────────
-- status — конечный автомат §5.3. paid ставится ТОЛЬКО серверным webhook (§10, инвариант 2).
create table orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete restrict,
  status        text not null default 'created' check (status in (
    'created', 'pending', 'paid', 'queued', 'printing', 'quality_check',
    'packing', 'ready_to_ship', 'shipped', 'delivered',
    'on_hold', 'reprint', 'cancelled', 'refunded'
  )),
  total         numeric(12, 2) not null default 0,
  currency      text not null default 'KZT',
  shipping_addr jsonb,
  tracking_no   text,
  carrier       text,
  payment_id    text,                           -- id транзакции провайдера
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  shipped_at    timestamptz
);

create index on orders (user_id);
create index on orders (status);

-- ── Позиции заказа ─────────────────────────────────────────────────
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders (id) on delete cascade,
  design_id    uuid references designs (id) on delete set null,
  variant_id   uuid references variants (id) on delete set null,
  print_method text,
  quantity     integer not null default 1 check (quantity > 0),
  unit_price   numeric(12, 2) not null default 0  -- = цена калькулятора (§5.5)
);

create index on order_items (order_id);

-- ── Платежи (лог webhook, §9) ──────────────────────────────────────
create table payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders (id) on delete cascade,
  provider     text not null,                   -- 'epay' / 'kaspi'
  provider_txn text,
  amount       numeric(12, 2) not null,
  status       text not null check (status in ('pending', 'success', 'failed')),
  raw_payload  jsonb,                            -- сырой webhook для аудита
  created_at   timestamptz not null default now()
);

create index on payments (order_id);
