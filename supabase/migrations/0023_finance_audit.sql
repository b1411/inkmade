-- 0023: финансовый леджер и аудит действий админа (CRM §6.2, §6.11, §8.3).

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('revenue', 'cogs', 'royalty', 'acquiring_fee', 'shipping', 'refund', 'other')),
  order_id uuid references public.orders (id) on delete set null,
  designer_id uuid references auth.users (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'KZT',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists finance_entries_type_idx on public.finance_entries (entry_type);
create index if not exists finance_entries_created_idx on public.finance_entries (created_at);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity, entity_id);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at);
