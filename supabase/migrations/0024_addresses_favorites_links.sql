-- 0024: адреса, избранное, телефон профиля; связь принтов с дизайнером; себестоимость позиции
-- (CRM §3.1 адреса/избранное, §8.4 связь заказа с принтом для роялти, §6.2 маржа).

alter table public.profiles add column if not exists phone text;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  city text not null,
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  print_id uuid references public.print_library (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_one_target check ((product_id is not null)::int + (print_id is not null)::int = 1)
);
create unique index if not exists favorites_user_product_uniq on public.favorites (user_id, product_id) where product_id is not null;
create unique index if not exists favorites_user_print_uniq on public.favorites (user_id, print_id) where print_id is not null;

-- принты дизайнеров: владелец + модерация (бренд-принты owner_id=null, уже одобрены)
alter table public.print_library add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.print_library add column if not exists moderation_status text not null default 'approved'
  check (moderation_status in ('pending', 'approved', 'rejected'));
alter table public.print_library add column if not exists moderation_note text;

-- позиция заказа: принт-источник, владелец для роялти, себестоимость для маржи
alter table public.order_items add column if not exists print_id uuid references public.print_library (id) on delete set null;
alter table public.order_items add column if not exists print_owner_id uuid references auth.users (id) on delete set null;
alter table public.order_items add column if not exists unit_cost numeric(12, 2) not null default 0;
