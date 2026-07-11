-- 0084: целостность реверса денег при возврате/отмене оплаченного заказа (аудит 2026-07-12).
--
-- ПРОБЛЕМА (3 находки):
-- 1. refund_order (0031) реверсирует роялти дизайнеров, но НЕ трогает shop_earnings/
--    shop_balances — refund_order предшествовал B2B-магазинам (0068). Возврат B2B-заказа
--    оставлял владельцу магазина начисленный available → он выводит деньги за возврат.
-- 2. change_order_status для paid→cancelled возвращал только сток, НО не разворачивал
--    роялти/долю магазина/revenue. Оператор отменял оплаченный заказ через доску /studio
--    и молча оставлял начисления + завышенную выручку. (refunded через доску вообще уходил
--    в generic-ветку без единого сторно — закрывается ещё и на уровне API, см. status.post.ts.)
-- 3. admin_finance_stats не вычитал shop_share из profit → прибыль платформы завышена
--    на Σ shop_share (реальные деньги, причитающиеся владельцам магазинов).
--
-- ФИКС: единая семантика реверса (роялти + доля магазина + refund-entry, offset выручки).
-- Тела refund_order и change_order_status воспроизведены ДОСЛОВНО из прод-версий
-- (0031 / 0082), добавлены только блоки shop-реверса и финансового реверса отмены.

-- ── refund_order: + реверс доли B2B-магазина ──────────────────────────────────
create or replace function public.refund_order(p_order_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_order public.orders%rowtype;
  rec record;
  v_reversed numeric(12, 2) := 0;
  v_shop_reversed numeric(12, 2) := 0;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;
  if v_order.paid_at is null then raise exception 'Возврат возможен только для оплаченного заказа'; end if;
  if v_order.status = 'refunded' then return jsonb_build_object('already_refunded', true); end if;

  -- реверс роялти дизайнеров
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
    insert into public.finance_entries (entry_type, order_id, designer_id, amount, note)
      values ('royalty', p_order_id, rec.designer_id, -rec.amt, 'Реверс роялти при возврате');
    v_reversed := v_reversed + rec.amt;
  end loop;

  update public.royalty_earnings set status = 'reversed'
    where order_id = p_order_id and status = 'accrued';

  -- реверс доли B2B-магазина (фикс 0084)
  for rec in
    select shop_id, sum(amount) as amt
    from public.shop_earnings
    where order_id = p_order_id and status = 'accrued'
    group by shop_id
  loop
    update public.shop_balances
      set total_earned = greatest(0, total_earned - rec.amt),
          available = greatest(0, available - rec.amt),
          updated_at = now()
      where shop_id = rec.shop_id;
    insert into public.finance_entries (entry_type, order_id, amount, note)
      values ('shop_share', p_order_id, -rec.amt, 'Реверс доли магазина при возврате');
    v_shop_reversed := v_shop_reversed + rec.amt;
  end loop;

  update public.shop_earnings set status = 'reversed'
    where order_id = p_order_id and status = 'accrued';

  insert into public.finance_entries (entry_type, order_id, amount, note)
    values ('refund', p_order_id, v_order.total, coalesce(p_note, 'Возврат заказа'));

  update public.orders set status = 'refunded' where id = p_order_id;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'refunded', auth.uid(), coalesce(p_note, 'Возврат (админ)'));

  return jsonb_build_object('refunded', true, 'royalty_reversed', v_reversed,
                            'shop_reversed', v_shop_reversed, 'amount', v_order.total);
end;
$function$;

-- ── change_order_status: paid→cancelled разворачивает финансы (не только сток) ──
create or replace function public.change_order_status(
  p_order_id uuid, p_to text, p_actor uuid, p_note text, p_tracking text, p_carrier text,
  p_expected_from text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_printed boolean;
  rec record;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;

  -- TOCTOU-гард: статус изменился с момента чтения оператором → отклоняем переход
  if p_expected_from is not null and v_order.status <> p_expected_from then
    raise exception 'Статус заказа изменился (% вместо %) — обновите страницу', v_order.status, p_expected_from
      using errcode = 'serialization_failure';
  end if;

  if p_to = 'shipped' then
    update public.orders set status = p_to, tracking_no = p_tracking, carrier = p_carrier, shipped_at = now()
      where id = p_order_id;
  else
    update public.orders set status = p_to where id = p_order_id;
  end if;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, p_to, p_actor, p_note);

  -- брак: заготовка испорчена (§8.3-8.4)
  if p_to = 'reprint' then
    for rec in select variant_id, quantity from public.order_items where order_id = p_order_id loop
      if rec.variant_id is null then continue; end if;
      insert into public.stock_movements (variant_id, delta, reason, order_id, actor_id)
        values (rec.variant_id, -rec.quantity, 'defect', p_order_id, p_actor);
      update public.variants set stock = greatest(0, stock - rec.quantity) where id = rec.variant_id;
    end loop;
  end if;

  -- отмена оплаченного: возврат заготовки только если НЕ доходили до печати (H4)
  if p_to = 'cancelled' and v_order.paid_at is not null then
    select exists (
      select 1 from public.order_status_log
      where order_id = p_order_id and to_status = 'printing'
    ) into v_printed;
    if not v_printed then
      for rec in select variant_id, quantity from public.order_items where order_id = p_order_id loop
        if rec.variant_id is null then continue; end if;
        insert into public.stock_movements (variant_id, delta, reason, order_id, actor_id)
          values (rec.variant_id, rec.quantity, 'correction', p_order_id, p_actor);
        update public.variants set stock = stock + rec.quantity where id = rec.variant_id;
      end loop;
    end if;

    -- финансовый реверс отмены оплаченного (фикс 0084): зеркалит refund_order, чтобы
    -- отмена через доску оператора не оставляла начисленными роялти/долю магазина и не
    -- завышала выручку. Идемпотентно по status='accrued'; cancelled — терминальный статус.
    for rec in
      select designer_id, sum(amount) as amt from public.royalty_earnings
      where order_id = p_order_id and status = 'accrued' group by designer_id
    loop
      update public.designer_balances
        set total_earned = greatest(0, total_earned - rec.amt),
            available = greatest(0, available - rec.amt), updated_at = now()
        where designer_id = rec.designer_id;
      insert into public.finance_entries (entry_type, order_id, designer_id, amount, note)
        values ('royalty', p_order_id, rec.designer_id, -rec.amt, 'Реверс роялти при отмене');
    end loop;
    update public.royalty_earnings set status = 'reversed'
      where order_id = p_order_id and status = 'accrued';

    for rec in
      select shop_id, sum(amount) as amt from public.shop_earnings
      where order_id = p_order_id and status = 'accrued' group by shop_id
    loop
      update public.shop_balances
        set total_earned = greatest(0, total_earned - rec.amt),
            available = greatest(0, available - rec.amt), updated_at = now()
        where shop_id = rec.shop_id;
      insert into public.finance_entries (entry_type, order_id, amount, note)
        values ('shop_share', p_order_id, -rec.amt, 'Реверс доли магазина при отмене');
    end loop;
    update public.shop_earnings set status = 'reversed'
      where order_id = p_order_id and status = 'accrued';

    insert into public.finance_entries (entry_type, order_id, amount, note)
      values ('refund', p_order_id, v_order.total, 'Возврат при отмене оплаченного заказа');
  end if;

  return jsonb_build_object('from', v_order.status, 'to', p_to);
end;
$$;

revoke all on function public.change_order_status(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.change_order_status(uuid, text, uuid, text, text, text, text) to service_role;

-- ── admin_finance_stats: вычитать shop_share из profit ────────────────────────
create or replace function public.admin_finance_stats(
  p_from timestamptz default null, p_to timestamptz default null
) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v jsonb;
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  select jsonb_build_object(
    'revenue', coalesce(sum(amount) filter (where entry_type = 'revenue'), 0),
    'cogs', coalesce(sum(amount) filter (where entry_type = 'cogs'), 0),
    'royalty', coalesce(sum(amount) filter (where entry_type = 'royalty'), 0),
    'shop_share', coalesce(sum(amount) filter (where entry_type = 'shop_share'), 0),
    'shipping', coalesce(sum(amount) filter (where entry_type = 'shipping'), 0),
    'acquiring', coalesce(sum(amount) filter (where entry_type = 'acquiring_fee'), 0),
    'refund', coalesce(sum(amount) filter (where entry_type = 'refund'), 0)
  ) into v
  from public.finance_entries
  where (p_from is null or created_at >= p_from) and (p_to is null or created_at <= p_to);

  -- profit = выручка − себестоимость − роялти − доля магазинов − доставка − эквайринг − возвраты
  v := v || jsonb_build_object('profit',
    (v ->> 'revenue')::numeric - (v ->> 'cogs')::numeric - (v ->> 'royalty')::numeric
    - (v ->> 'shop_share')::numeric - (v ->> 'shipping')::numeric
    - (v ->> 'acquiring')::numeric - (v ->> 'refund')::numeric);
  return v;
end;
$function$;
