-- 0053: серверная корзина для залогиненных (кросс-девайс, §9.1). Гость держит корзину
-- в localStorage; при входе локальные позиции сливаются в эту таблицу и дальше
-- корзина синхронизируется между устройствами. RLS — только владелец.
-- spec хранит полную спецификацию нанесения (тот же JSON, что идёт в order_item),
-- включая composition_url для превью — позиция полностью восстановима в конструкторе.

create table if not exists public.cart_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  variant_id   uuid references public.variants (id) on delete set null,
  slug         text not null,
  alias        text,
  title        text not null,
  color_name   text not null default '',
  color_hex    text not null default '',
  size         text not null default '',
  print_method text,
  spec         jsonb not null default '{}'::jsonb,
  unit_price   numeric(12, 2) not null default 0,
  quantity     integer not null default 1 check (quantity >= 1),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists cart_items_user_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;

-- владелец делает всё со своими позициями; (select auth.uid()) — initplan-перф (см. 0041)
-- drop-before-create — идемпотентность при повторном прогоне миграций (CI / db push)
drop policy if exists "cart_items_owner_all" on public.cart_items;
create policy "cart_items_owner_all" on public.cart_items for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
