-- 0065: заявки на открытие B2B-магазина мерча (Фаза B1).
-- Публичная форма с посадочной /business складывает лид сюда; админ разбирает очередь
-- в /admin/shops (approve/reject + связь с заявителем). Создание самого магазина
-- (таблицы shops/shop_items) — отдельная миграция фазы B2. Аддитивно, идемпотентно.

create table if not exists public.shop_applications (
  id           uuid primary key default gen_random_uuid(),
  org_name     text not null,
  contact_name text not null,
  phone        text not null,
  email        text not null,
  desired_slug text,                 -- пожелание к адресу ___.inkmade.kz (валидация — в B2)
  audience     text,                 -- для кого/размер (студенты, сотрудники, фанаты…)
  comment      text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note   text,                 -- внутренняя пометка при разборе
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users (id) on delete set null
);
create index if not exists shop_applications_status_idx
  on public.shop_applications (status, created_at desc);

alter table public.shop_applications enable row level security;

-- Вставка — ТОЛЬКО через server-API на service-role (валидация + анти-спам на границе),
-- поэтому anon/authenticated insert-политики намеренно НЕТ: прямая вставка из браузера
-- запрещена RLS. Персонал читает и резолвит заявки.
create policy shop_applications_admin_read on public.shop_applications for select
  using (private.is_staff());
create policy shop_applications_admin_update on public.shop_applications for update
  using (private.is_admin()) with check (private.is_admin());
