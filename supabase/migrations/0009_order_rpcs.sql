-- INKMADE — миграция 0009: атомарные операции заказа (аудит C6/H4)
-- supabase-js шлёт каждый запрос отдельным HTTP — нет транзакции. Сбой между
-- шагами оставлял данные в частичном состоянии (статус без лога, двойное списание
-- при гонке webhook). Переносим мутации в Postgres-функции: одна транзакция +
-- pg_advisory_xact_lock по заказу. SECURITY DEFINER, execute только service_role.

-- ── оплата: paid + payment + списание склада + лог (§9, §5.3) ──────
create or replace function public.apply_paid(
  p_order_id uuid, p_provider_txn text, p_raw jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  rec record;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;

  -- идемпотентность: повторный webhook не дублирует эффекты
  if v_order.paid_at is not null then return jsonb_build_object('already_paid', true); end if;

  update public.orders
    set status = 'paid', paid_at = now(), payment_id = p_provider_txn
    where id = p_order_id;

  insert into public.payments (order_id, provider, provider_txn, amount, status, raw_payload)
    values (p_order_id, 'mock', p_provider_txn, v_order.total, 'success', p_raw);

  for rec in select variant_id, quantity from public.order_items where order_id = p_order_id loop
    if rec.variant_id is null then continue; end if;
    insert into public.stock_movements (variant_id, delta, reason, order_id)
      values (rec.variant_id, -rec.quantity, 'order', p_order_id);
    update public.variants set stock = greatest(0, stock - rec.quantity) where id = rec.variant_id;
  end loop;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'paid', null, 'Оплата подтверждена (webhook)');

  return jsonb_build_object('already_paid', false);
end;
$$;

-- ── смена статуса: order + лог + складские эффекты (§5.3, §8.3-8.5) ──
-- Валидация перехода/роли/причины — на сервере (shared config). Здесь — атомарная запись.
-- H4: возврат заготовки при cancelled ТОЛЬКО если заказ не доходил до printing.
create or replace function public.change_order_status(
  p_order_id uuid, p_to text, p_actor uuid, p_note text, p_tracking text, p_carrier text
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
  end if;

  return jsonb_build_object('from', v_order.status, 'to', p_to);
end;
$$;

-- доступ только серверу (service_role): иначе клиент мог бы вызвать paid напрямую
revoke all on function public.apply_paid(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.change_order_status(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_paid(uuid, text, jsonb) to service_role;
grant execute on function public.change_order_status(uuid, text, uuid, text, text, text) to service_role;
