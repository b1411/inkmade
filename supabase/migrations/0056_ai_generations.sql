-- 0056: AI-генерация принтов (text-to-design, §AI). Журнал генераций + месячные квоты.
-- Бесплатно с лимитом на пользователя; биллинг API идёт с нас, поэтому квота — серверный
-- инвариант (как used_count у промокодов, см. 0033). Записи создаёт ТОЛЬКО сервер
-- (service role); пользователь видит лишь свои строки.

-- ── журнал генераций (аудит, материал для будущей галереи/модерации) ──
create table if not exists public.ai_generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  prompt        text not null,
  style         text,
  image_url     text,
  status        text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  created_at    timestamptz not null default now()
);
create index if not exists ai_generations_user_idx on public.ai_generations (user_id, created_at desc);

-- ── месячная квота на пользователя ──
-- month_year = 'YYYY-MM'. max_uses фиксируется на момент первой генерации месяца
-- (значение приходит из app-конфига NUXT aiMonthlyQuota), новый месяц = новая строка.
create table if not exists public.ai_quotas (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month_year text not null,
  used_count integer not null default 0 check (used_count >= 0),
  max_uses   integer not null default 5,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_year)
);

alter table public.ai_generations enable row level security;
alter table public.ai_quotas enable row level security;

-- владелец видит свои генерации/квоты (запись — только service role, политики на запись нет)
-- (select auth.uid()) — initplan-перф (см. 0041); drop-before-create — идемпотентность
drop policy if exists "ai_generations_owner_read" on public.ai_generations;
create policy "ai_generations_owner_read" on public.ai_generations for select
  using (user_id = (select auth.uid()));

drop policy if exists "ai_quotas_owner_read" on public.ai_quotas;
create policy "ai_quotas_owner_read" on public.ai_quotas for select
  using (user_id = (select auth.uid()));

-- атомарный учёт: создаём строку месяца при необходимости и инкрементим только в пределах лимита.
-- Возвращает true, если генерация разрешена (лимит не исчерпан) и счётчик увеличен.
create or replace function public.bump_ai_quota(p_user_id uuid, p_month text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_ok boolean;
begin
  insert into public.ai_quotas (user_id, month_year, used_count, max_uses)
    values (p_user_id, p_month, 0, p_max)
    on conflict (user_id, month_year) do nothing;

  update public.ai_quotas
    set used_count = used_count + 1, updated_at = now()
    where user_id = p_user_id
      and month_year = p_month
      and used_count < max_uses
    returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

-- откат при неуспешной генерации: не списываем за ошибку провайдера
create or replace function public.refund_ai_quota(p_user_id uuid, p_month text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_quotas
    set used_count = greatest(used_count - 1, 0), updated_at = now()
    where user_id = p_user_id and month_year = p_month;
end;
$$;

revoke all on function public.bump_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.bump_ai_quota(uuid, text, integer) to service_role;
revoke all on function public.refund_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(uuid, text) to service_role;

-- происхождение дизайна + ссылка на генерацию (для сохранённых AI-принтов)
alter table public.designs add column if not exists origin text not null default 'user_upload';
alter table public.designs add column if not exists ai_generation_id uuid references public.ai_generations (id) on delete set null;
