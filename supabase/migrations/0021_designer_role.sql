-- 0021: роль designer + дизайнерские профили и история ставки роялти (CRM §2, §8.2).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'designer', 'operator', 'admin'));

-- хелпер роли (по образцу private.is_staff/is_admin из 0005)
create or replace function private.is_designer(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = uid) = 'designer', false);
$$;
grant execute on function private.is_designer(uuid) to anon, authenticated;

-- расширенный профиль дизайнера (отдельно от profiles)
create table if not exists public.designer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  royalty_pct numeric(5, 2) not null default 10,
  tax_status text not null default 'individual' check (tax_status in ('individual', 'self_employed', 'ip')),
  payout_details jsonb,
  is_public boolean not null default false,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- история изменения ставки (чтобы не пересчитывать задним числом, §7.2)
create table if not exists public.royalty_rate_history (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references auth.users (id) on delete cascade,
  old_pct numeric(5, 2),
  new_pct numeric(5, 2) not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists royalty_rate_history_designer_idx on public.royalty_rate_history (designer_id);
