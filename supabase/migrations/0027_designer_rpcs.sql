-- 0027: RPC дизайнерского/финансового контура + аудит-триггеры (CRM §6.2, §6.3, §7.2).

-- Заявка дизайнера на выплату (проверка доступного баланса внутри)
create or replace function public.request_payout(p_amount numeric, p_method text default null, p_details jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_avail numeric; v_id uuid;
begin
  if not private.is_designer() then raise exception 'Только дизайнер'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Некорректная сумма'; end if;
  select available into v_avail from public.designer_balances where designer_id = auth.uid();
  if coalesce(v_avail, 0) < p_amount then raise exception 'Недостаточно доступного баланса'; end if;
  insert into public.payouts (designer_id, amount, method, details, status)
    values (auth.uid(), p_amount, p_method, p_details, 'requested') returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.request_payout(numeric, text, jsonb) from public, anon;
grant execute on function public.request_payout(numeric, text, jsonb) to authenticated;

-- Админ отмечает выплату проведённой: баланс available→paid, начисления → paid
create or replace function public.mark_payout_paid(p_payout_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_p public.payouts%rowtype;
begin
  if not private.is_admin() then raise exception 'Только админ'; end if;
  perform pg_advisory_xact_lock(hashtext(p_payout_id::text));
  select * into v_p from public.payouts where id = p_payout_id;
  if not found then raise exception 'Выплата не найдена'; end if;
  if v_p.status = 'paid' then return; end if;

  update public.payouts set status = 'paid', paid_at = now(), processed_by = auth.uid() where id = p_payout_id;
  update public.designer_balances
    set total_paid = total_paid + v_p.amount,
        available = greatest(0, available - v_p.amount),
        updated_at = now()
    where designer_id = v_p.designer_id;
  update public.royalty_earnings
    set status = 'paid', payout_id = p_payout_id
    where designer_id = v_p.designer_id and status = 'accrued';
  -- роялти как расход уже записан при начислении (apply_paid) — повторно НЕ пишем
end;
$$;
revoke all on function public.mark_payout_paid(uuid) from public, anon;
grant execute on function public.mark_payout_paid(uuid) to authenticated;

-- Админ меняет ставку роялти дизайнера (с историей)
create or replace function public.set_royalty_rate(p_designer_id uuid, p_new_pct numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old numeric;
begin
  if not private.is_admin() then raise exception 'Только админ'; end if;
  select royalty_pct into v_old from public.designer_profiles where id = p_designer_id;
  update public.designer_profiles set royalty_pct = p_new_pct where id = p_designer_id;
  insert into public.royalty_rate_history (designer_id, old_pct, new_pct, changed_by)
    values (p_designer_id, v_old, p_new_pct, auth.uid());
end;
$$;
revoke all on function public.set_royalty_rate(uuid, numeric) from public, anon;
grant execute on function public.set_royalty_rate(uuid, numeric) to authenticated;

-- Финансовая сводка для админ-дашборда (P&L из finance_entries)
create or replace function public.admin_finance_stats(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  select jsonb_build_object(
    'revenue', coalesce(sum(amount) filter (where entry_type = 'revenue'), 0),
    'cogs', coalesce(sum(amount) filter (where entry_type = 'cogs'), 0),
    'royalty', coalesce(sum(amount) filter (where entry_type = 'royalty' and amount > 0), 0),
    'shipping', coalesce(sum(amount) filter (where entry_type = 'shipping'), 0),
    'acquiring', coalesce(sum(amount) filter (where entry_type = 'acquiring_fee'), 0),
    'refund', coalesce(sum(amount) filter (where entry_type = 'refund'), 0)
  ) into v
  from public.finance_entries
  where (p_from is null or created_at >= p_from) and (p_to is null or created_at <= p_to);

  v := v || jsonb_build_object('profit',
    (v ->> 'revenue')::numeric - (v ->> 'cogs')::numeric - (v ->> 'royalty')::numeric
    - (v ->> 'shipping')::numeric - (v ->> 'acquiring')::numeric - (v ->> 'refund')::numeric);
  return v;
end;
$$;
revoke all on function public.admin_finance_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finance_stats(timestamptz, timestamptz) to authenticated;

-- Аудит: смена роли пользователя
create or replace function public.audit_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    insert into public.admin_audit_log (actor_id, action, entity, entity_id, before, after)
      values (auth.uid(), 'role_change', 'profile', new.id,
              jsonb_build_object('role', old.role), jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_profile_role() from public, anon, authenticated;
drop trigger if exists trg_audit_profile_role on public.profiles;
create trigger trg_audit_profile_role after update on public.profiles
  for each row execute function public.audit_profile_role();

-- Аудит: изменение цены/публикации товара
create or replace function public.audit_product_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.base_price is distinct from old.base_price or new.is_active is distinct from old.is_active then
    insert into public.admin_audit_log (actor_id, action, entity, entity_id, before, after)
      values (auth.uid(), 'product_update', 'product', new.id,
              jsonb_build_object('base_price', old.base_price, 'is_active', old.is_active),
              jsonb_build_object('base_price', new.base_price, 'is_active', new.is_active));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_product_change() from public, anon, authenticated;
drop trigger if exists trg_audit_product_change on public.products;
create trigger trg_audit_product_change after update on public.products
  for each row execute function public.audit_product_change();
