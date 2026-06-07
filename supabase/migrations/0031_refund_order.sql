-- 0031: возврат заказа с реверсом роялти (CRM §7.3 «при возврате роялти аннулируется»).
-- Без этого дизайнер получает деньги за отменённый заказ, баланс/прибыль некорректны.

-- ── Возврат: реверс начисленных (ещё не выплаченных) роялти + финансовый леджер ──
create or replace function public.refund_order(p_order_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  rec record;
  v_reversed numeric(12, 2) := 0;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;
  if v_order.paid_at is null then raise exception 'Возврат возможен только для оплаченного заказа'; end if;
  if v_order.status = 'refunded' then return jsonb_build_object('already_refunded', true); end if;

  -- реверс начисленных роялти по дизайнерам (выплаченные не трогаем — деньги ушли)
  for rec in
    select designer_id, sum(amount) as amt
    from public.royalty_earnings
    where order_id = p_order_id and status = 'accrued'
    group by designer_id
  loop
    update public.designer_balances
      set total_earned = greatest(0, total_earned - rec.amt),
          available = greatest(0, available - rec.amt),
          updated_at = now()
      where designer_id = rec.designer_id;
    -- отрицательная запись роялти компенсирует расход в P&L
    insert into public.finance_entries (entry_type, order_id, designer_id, amount, note)
      values ('royalty', p_order_id, rec.designer_id, -rec.amt, 'Реверс роялти при возврате');
    v_reversed := v_reversed + rec.amt;
  end loop;

  update public.royalty_earnings set status = 'reversed'
    where order_id = p_order_id and status = 'accrued';

  -- возврат выручки в P&L (admin_finance_stats вычитает refund)
  insert into public.finance_entries (entry_type, order_id, amount, note)
    values ('refund', p_order_id, v_order.total, coalesce(p_note, 'Возврат заказа'));

  update public.orders set status = 'refunded' where id = p_order_id;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'refunded', auth.uid(), coalesce(p_note, 'Возврат (админ)'));

  return jsonb_build_object('refunded', true, 'royalty_reversed', v_reversed, 'amount', v_order.total);
end;
$$;

revoke all on function public.refund_order(uuid, text) from public, anon;
grant execute on function public.refund_order(uuid, text) to authenticated;

-- ── P&L: роялти считаем НЕТТО (начисления минус реверсы), чтобы возврат уменьшал расход ──
create or replace function public.admin_finance_stats(
  p_from timestamptz default null, p_to timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  select jsonb_build_object(
    'revenue', coalesce(sum(amount) filter (where entry_type = 'revenue'), 0),
    'cogs', coalesce(sum(amount) filter (where entry_type = 'cogs'), 0),
    'royalty', coalesce(sum(amount) filter (where entry_type = 'royalty'), 0),
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
