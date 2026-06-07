-- INKMADE — миграция 0011: согласия пользователя + фискальный чек (аудит C5/M1)
-- master §17.1/§24: согласие с ToS/Privacy и перенос ответственности за копирайт —
-- юридическая защита РК. Без фиксации (с версией, датой, IP) согласие не доказать.

create table if not exists user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  order_id     uuid references orders (id) on delete set null,
  consent_type text not null check (consent_type in ('tos', 'privacy', 'copyright')),
  doc_version  text not null,
  ip           text,
  accepted_at  timestamptz not null default now()
);

create index if not exists user_consents_user_idx on user_consents (user_id);
create index if not exists user_consents_order_idx on user_consents (order_id);

alter table user_consents enable row level security;

-- клиент видит и фиксирует только свои согласия
drop policy if exists consents_owner_read on user_consents;
drop policy if exists consents_owner_insert on user_consents;
drop policy if exists consents_staff_read on user_consents;
create policy consents_owner_read on user_consents for select
  using (user_id = auth.uid());
create policy consents_owner_insert on user_consents for insert
  with check (user_id = auth.uid());
-- staff читают все согласия (разбор споров/претензий)
create policy consents_staff_read on user_consents for select
  using (private.is_staff());

-- фискальный чек заказа (§17.1): требование закона РК при онлайн-оплате
alter table orders add column if not exists fiscal_receipt jsonb;
