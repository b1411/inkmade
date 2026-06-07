-- 0033: промокоды (CRM §6.7). Скидка применяется СЕРВЕРНО при создании заказа.
-- Оптовые пороги (price_tiers) — отдельно, на B2B-фазе.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  min_order numeric(12, 2) not null default 0,
  max_uses integer,                       -- null = без лимита
  used_count integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- управление — только admin; применение — серверно через service role (обходит RLS)
create policy promo_codes_admin_all on public.promo_codes for all
  using (private.is_admin()) with check (private.is_admin());

-- скидка и применённый код на заказе (для отчётности и чека)
alter table public.orders add column if not exists discount numeric(12, 2) not null default 0;
alter table public.orders add column if not exists promo_code text;

-- атомарный учёт использования: инкремент только в пределах лимита
create or replace function public.bump_promo_use(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_ok boolean;
begin
  update public.promo_codes
    set used_count = used_count + 1
    where upper(code) = upper(p_code)
      and active
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses)
    returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.bump_promo_use(text) from public, anon, authenticated;
grant execute on function public.bump_promo_use(text) to service_role;
