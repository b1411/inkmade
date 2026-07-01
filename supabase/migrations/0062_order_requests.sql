-- 0062: клиентские заявки на отмену/возврат заказа (Фаза C3).
-- Клиент-инициированный сигнал (в отличие от staff-side admin/returns, где заказ
-- уже в проблемном статусе). Персонал видит заявку и решает через FSM статусов.
-- Аддитивно, идемпотентно.

create table if not exists public.order_requests (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('cancel', 'return')),
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index if not exists order_requests_order_idx on public.order_requests (order_id);
create index if not exists order_requests_user_idx on public.order_requests (user_id);
-- не более одной открытой заявки на заказ
create unique index if not exists order_requests_one_pending
  on public.order_requests (order_id) where status = 'pending';

alter table public.order_requests enable row level security;

-- клиент: создаёт заявку ТОЛЬКО по своему заказу и ТОЛЬКО в статусе pending
-- (нельзя самому проставить approved); читает свои заявки.
create policy order_requests_owner_insert on public.order_requests for insert
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and resolved_at is null
    and resolved_by is null
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
  );
create policy order_requests_owner_read on public.order_requests for select
  using (user_id = (select auth.uid()));

-- персонал/админ: читают все заявки и резолвят (approve/reject)
create policy order_requests_staff_read on public.order_requests for select
  using (private.is_staff());
create policy order_requests_staff_update on public.order_requests for update
  using (private.is_staff()) with check (private.is_staff());
