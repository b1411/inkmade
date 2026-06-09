-- 0036: доказательная база заказа (CRM §6.8). Фото QC/брака для разбора возвратов.
-- Композиция (preview_url) и оригинал принта уже хранятся в designs; здесь — фото изделия из цеха.

create table if not exists public.order_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  path text not null,                         -- путь в приватном бакете evidence
  kind text not null default 'qc' check (kind in ('qc', 'defect', 'other')),
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_evidence_order_idx on public.order_evidence (order_id);

alter table public.order_evidence enable row level security;
-- персонал (operator/admin) читает и пишет; финансов здесь нет
create policy order_evidence_staff_all on public.order_evidence for all
  using (private.is_staff()) with check (private.is_staff());

-- приватный бакет для фото-доказательств; доступ только персоналу
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy evidence_staff_read on storage.objects for select
  using (bucket_id = 'evidence' and private.is_staff());
create policy evidence_staff_insert on storage.objects for insert
  with check (bucket_id = 'evidence' and private.is_staff());
create policy evidence_staff_delete on storage.objects for delete
  using (bucket_id = 'evidence' and private.is_staff());
