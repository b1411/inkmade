-- 0022: начисления роялти, баланс дизайнера, выплаты (CRM §8.2).

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references auth.users (id) on delete restrict,
  amount numeric(12, 2) not null,
  method text,
  details jsonb,
  status text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  processed_by uuid references auth.users (id) on delete set null
);
create index if not exists payouts_designer_idx on public.payouts (designer_id);

create table if not exists public.royalty_earnings (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references auth.users (id) on delete restrict,
  order_id uuid references public.orders (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  print_id uuid references public.print_library (id) on delete set null,
  sale_base numeric(12, 2) not null,        -- база (unit_price × qty)
  rate_pct numeric(5, 2) not null,          -- ставка на момент продажи (зафиксирована)
  amount numeric(12, 2) not null,           -- начислено (+) или аннулировано (−)
  status text not null default 'accrued' check (status in ('accrued', 'paid', 'reversed')),
  payout_id uuid references public.payouts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists royalty_earnings_designer_idx on public.royalty_earnings (designer_id);
create index if not exists royalty_earnings_order_idx on public.royalty_earnings (order_id);

-- денормализованный баланс (истина — royalty_earnings + payouts)
create table if not exists public.designer_balances (
  designer_id uuid primary key references auth.users (id) on delete cascade,
  total_earned numeric(12, 2) not null default 0,
  total_paid numeric(12, 2) not null default 0,
  available numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);
