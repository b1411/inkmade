-- 0028: настройки платформы (key/value) + Realtime для дизайнерских продаж (CRM §6.12, §4.5).
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
create policy ps_read on public.platform_settings for select using (true);
create policy ps_admin_write on public.platform_settings for all
  using (private.is_admin()) with check (private.is_admin());

-- Realtime: дизайнер видит новую продажу мгновенно (лента/баланс)
do $$
begin
  begin
    alter publication supabase_realtime add table public.royalty_earnings;
  exception when duplicate_object then null;
  end;
end $$;
