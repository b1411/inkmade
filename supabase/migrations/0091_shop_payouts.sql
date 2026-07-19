-- 0091: заявки на выплату владельцам B2B-магазинов.
-- Владелец запрашивает весь доступный баланс. Сумма и магазин определяются на
-- сервере; одна незавершённая заявка резервирует начисления и блокирует дубль.

create table if not exists public.shop_payouts (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete restrict,
  amount       numeric(12, 2) not null check (amount > 0),
  method       text,
  details      jsonb,
  status       text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  paid_at      timestamptz,
  processed_by uuid references auth.users (id) on delete set null
);

create index if not exists shop_payouts_shop_idx on public.shop_payouts (shop_id, requested_at desc);
create index if not exists shop_payouts_status_idx on public.shop_payouts (status, requested_at);

alter table public.shop_payouts enable row level security;
create policy shop_payouts_read on public.shop_payouts for select
  using (exists (
    select 1 from public.shops s
    where s.id = shop_id and (s.owner_id = (select auth.uid()) or private.is_admin())
  ));
create policy shop_payouts_admin_all on public.shop_payouts for all
  using (private.is_admin()) with check (private.is_admin());

alter table public.shop_earnings
  add constraint shop_earnings_payout_id_fkey
  foreign key (payout_id) references public.shop_payouts (id) on delete set null;

create or replace function public.request_shop_payout(
  p_shop_id uuid,
  p_method text default null,
  p_details jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_available numeric(12, 2);
  v_threshold numeric(12, 2) := 5000;
  v_reserved numeric(12, 2);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Требуется вход'; end if;
  if not exists (
    select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()
  ) then raise exception 'Магазин не найден или недостаточно прав'; end if;
  if nullif(trim(p_method), '') is null
     or p_details is null
     or nullif(trim(p_details ->> 'account'), '') is null then
    raise exception 'Укажите способ и реквизиты выплаты';
  end if;

  perform pg_advisory_xact_lock(hashtext('shop-payout:' || p_shop_id::text));

  if exists (
    select 1 from public.shop_payouts where shop_id = p_shop_id and status = 'requested'
  ) then raise exception 'Заявка на выплату уже создана'; end if;

  select available into v_available
    from public.shop_balances where shop_id = p_shop_id for update;

  begin
    select coalesce((value #>> '{}')::numeric, 5000) into v_threshold
      from public.platform_settings where key = 'payout.threshold';
  exception when others then
    v_threshold := 5000;
  end;

  if coalesce(v_available, 0) < coalesce(v_threshold, 5000) then
    raise exception 'Минимальная сумма выплаты — % ₸', coalesce(v_threshold, 5000);
  end if;

  insert into public.shop_payouts (shop_id, amount, method, details)
    values (p_shop_id, v_available, nullif(trim(p_method), ''), p_details)
    returning id into v_id;

  -- Резервируем только начисления, существовавшие в момент заявки. Новые продажи
  -- после неё останутся доступными для следующей выплаты.
  update public.shop_earnings
    set payout_id = v_id
    where shop_id = p_shop_id and status = 'accrued' and payout_id is null;

  select coalesce(sum(amount), 0) into v_reserved
    from public.shop_earnings where payout_id = v_id and status = 'accrued';
  if abs(v_reserved - v_available) > 0.01 then
    raise exception 'Баланс начислений требует сверки перед выплатой';
  end if;

  return v_id;
end;
$$;

revoke all on function public.request_shop_payout(uuid, text, jsonb) from public, anon;
grant execute on function public.request_shop_payout(uuid, text, jsonb) to authenticated;

create or replace function public.process_shop_payout(p_payout_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_p public.shop_payouts%rowtype; v_available numeric(12, 2); v_reserved numeric(12, 2);
begin
  if not private.is_admin() then raise exception 'Только администратор'; end if;
  if p_status is null or p_status not in ('paid', 'rejected') then raise exception 'Некорректный статус'; end if;

  perform pg_advisory_xact_lock(hashtext('shop-payout-row:' || p_payout_id::text));
  select * into v_p from public.shop_payouts where id = p_payout_id for update;
  if not found then raise exception 'Заявка не найдена'; end if;
  if v_p.status = p_status then return; end if;
  if v_p.status <> 'requested' then raise exception 'Заявка уже обработана'; end if;

  if p_status = 'rejected' then
    update public.shop_payouts
      set status = 'rejected', processed_by = auth.uid()
      where id = p_payout_id;
    update public.shop_earnings set payout_id = null
      where payout_id = p_payout_id and status = 'accrued';
    return;
  end if;

  select available into v_available from public.shop_balances
    where shop_id = v_p.shop_id for update;
  if coalesce(v_available, 0) < v_p.amount then
    raise exception 'Доступный баланс изменился — отклоните заявку и создайте новую';
  end if;
  select coalesce(sum(amount), 0) into v_reserved
    from public.shop_earnings where payout_id = p_payout_id and status = 'accrued';
  if abs(v_reserved - v_p.amount) > 0.01 then
    raise exception 'Состав начислений изменился — отклоните заявку и создайте новую';
  end if;

  update public.shop_payouts
    set status = 'paid', paid_at = now(), processed_by = auth.uid()
    where id = p_payout_id;
  update public.shop_balances
    set total_paid = total_paid + v_p.amount,
        available = available - v_p.amount,
        updated_at = now()
    where shop_id = v_p.shop_id;
  update public.shop_earnings set status = 'paid'
    where payout_id = p_payout_id and status = 'accrued';
end;
$$;

revoke all on function public.process_shop_payout(uuid, text) from public, anon;
grant execute on function public.process_shop_payout(uuid, text) to authenticated;
