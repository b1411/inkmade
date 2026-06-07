-- 0025: RLS для нового контура (CRM §8.5). Дизайнер видит своё; admin всё; финансы/аудит — admin.

alter table public.designer_profiles enable row level security;
alter table public.royalty_rate_history enable row level security;
alter table public.royalty_earnings enable row level security;
alter table public.designer_balances enable row level security;
alter table public.payouts enable row level security;
alter table public.finance_entries enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;

-- designer_profiles: сам читает/правит; публичные витрины видны всем; admin всё
create policy designer_profiles_read on public.designer_profiles for select
  using (id = auth.uid() or is_public or private.is_admin());
create policy designer_profiles_self_update on public.designer_profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy designer_profiles_admin_all on public.designer_profiles for all
  using (private.is_admin()) with check (private.is_admin());

-- royalty_rate_history: дизайнер читает свою; пишет только admin
create policy rrh_read on public.royalty_rate_history for select
  using (designer_id = auth.uid() or private.is_admin());
create policy rrh_admin_all on public.royalty_rate_history for all
  using (private.is_admin()) with check (private.is_admin());

-- royalty_earnings: дизайнер читает свои; admin всё
create policy re_read on public.royalty_earnings for select
  using (designer_id = auth.uid() or private.is_admin());
create policy re_admin_all on public.royalty_earnings for all
  using (private.is_admin()) with check (private.is_admin());

-- designer_balances: сам читает; admin всё
create policy db_read on public.designer_balances for select
  using (designer_id = auth.uid() or private.is_admin());
create policy db_admin_all on public.designer_balances for all
  using (private.is_admin()) with check (private.is_admin());

-- payouts: дизайнер читает свои; admin всё (создание заявки — через RPC request_payout)
create policy payouts_read on public.payouts for select
  using (designer_id = auth.uid() or private.is_admin());
create policy payouts_admin_all on public.payouts for all
  using (private.is_admin()) with check (private.is_admin());

-- finance_entries, admin_audit_log: только admin
create policy fe_admin on public.finance_entries for all
  using (private.is_admin()) with check (private.is_admin());
create policy aal_admin_read on public.admin_audit_log for select
  using (private.is_admin());

-- addresses, favorites: владелец
create policy addresses_owner_all on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_owner_all on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- print_library: публично только одобренные+активные; владелец видит/правит свои; admin всё (write_admin из 0005)
drop policy if exists print_library_read on public.print_library;
create policy print_library_read on public.print_library for select
  using ((is_active and moderation_status = 'approved') or owner_id = auth.uid() or private.is_admin());
create policy print_library_owner_insert on public.print_library for insert
  with check (owner_id = auth.uid() and private.is_designer());
create policy print_library_owner_update on public.print_library for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- гард модерации принта: статус модерации меняет только admin; загрузка дизайнера всегда 'pending'
create or replace function public.guard_print_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.owner_id is not null and auth.uid() is not null and not private.is_admin() then
      new.moderation_status := 'pending';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.moderation_status is distinct from old.moderation_status
       and auth.uid() is not null and not private.is_admin() then
      raise exception 'Модерацию принта меняет только админ';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_print_moderation() from public, anon, authenticated;
drop trigger if exists trg_guard_print_moderation on public.print_library;
create trigger trg_guard_print_moderation before insert or update on public.print_library
  for each row execute function public.guard_print_moderation();
