-- INKMADE — миграция 0012: фискальный чек в apply_paid (аудит M1)
-- При подтверждении оплаты формируется структура фискального чека (§17.1).
-- ВНИМАНИЕ: это ЗАГЛУШКА — реальная фискализация требует интеграции с ОФД РК
-- (Webkassa/Kaspi ККМ). Статус 'pending_fiscalization' помечает чек как нефискализированный.

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

  if v_order.paid_at is not null then return jsonb_build_object('already_paid', true); end if;

  update public.orders
    set status = 'paid', paid_at = now(), payment_id = p_provider_txn,
        fiscal_receipt = jsonb_build_object(
          'status', 'pending_fiscalization',
          'provider', 'mock',
          'provider_txn', p_provider_txn,
          'amount', v_order.total,
          'currency', v_order.currency,
          'issued_at', now(),
          'note', 'Заглушка: фискализация ОФД РК (ККМ) не подключена'
        )
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

revoke all on function public.apply_paid(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_paid(uuid, text, jsonb) to service_role;
