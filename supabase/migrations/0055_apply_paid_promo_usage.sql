-- 0055: apply_paid v5 — учёт промокода переносится с СОЗДАНИЯ заказа на ОПЛАТУ.
-- Аудит 2026-06-30, корректность заказа #4. Раньше bump_promo_use вызывался в
-- server/api/orders/create.post.ts при создании заказа: брошенная корзина «сжигала»
-- использование кода (used_count рос без оплаты, лимит max_uses исчерпывался зря).
-- Теперь инкремент происходит здесь — при подтверждённой оплате, ровно один раз на
-- заказ (paid_at-guard в начале функции делает тело идемпотентным). used_count =
-- число ОПЛАЧЕННЫХ применений; evaluatePromo блокирует новые checkout при достижении
-- max_uses. Скидка по-прежнему фиксируется при создании (orders.discount/promo_code),
-- здесь только учитывается факт использования.
--
-- Допустимый компромисс: между созданием и оплатой несколько заказов могут получить
-- скидку сверх max_uses (инкремента при создании больше нет) — небольшое окно
-- пере-выдачи скидки, что несравнимо лучше прежнего «сжигания» кода брошенной корзиной.
-- Тело идентично 0052, добавлен ТОЛЬКО блок учёта промокода.

create or replace function public.apply_paid(
  p_order_id uuid, p_provider_txn text, p_raw jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  rec record;
  v_cogs numeric(12, 2) := 0;
  v_royalty_total numeric(12, 2) := 0;
  v_rate numeric(5, 2);
  v_base numeric(12, 2);
  v_roy numeric(12, 2);
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Заказ не найден'; end if;
  if v_order.paid_at is not null then return jsonb_build_object('already_paid', true); end if;

  -- guard состояния: оплачивать можно только заказ, не покинувший пред-оплатные статусы
  if v_order.status not in ('created', 'pending') then
    raise exception 'Заказ в статусе % не может быть оплачен', v_order.status;
  end if;

  update public.orders
    set status = 'paid', paid_at = now(), payment_id = p_provider_txn,
        fiscal_receipt = jsonb_build_object(
          'status', 'pending_fiscalization', 'provider', 'mock', 'provider_txn', p_provider_txn,
          'amount', v_order.total, 'currency', v_order.currency, 'issued_at', now(),
          'note', 'Заглушка: фискализация ОФД РК (ККМ) не подключена'
        )
    where id = p_order_id;

  insert into public.payments (order_id, provider, provider_txn, amount, status, raw_payload)
    values (p_order_id, 'mock', p_provider_txn, v_order.total, 'success', p_raw);

  -- учёт промокода ТОЛЬКО при оплате (см. шапку миграции). Идемпотентно: apply_paid
  -- выполняется один раз на заказ (paid_at-guard выше).
  if v_order.promo_code is not null and v_order.discount > 0 then
    update public.promo_codes set used_count = used_count + 1
      where upper(code) = upper(v_order.promo_code);
  end if;

  -- по каждой позиции: списание склада + себестоимость + роялти (если принт дизайнера)
  for rec in select id, variant_id, quantity, unit_price, unit_cost, print_id, print_owner_id
             from public.order_items where order_id = p_order_id loop
    if rec.variant_id is not null then
      -- атомарное guarded-списание: затрагивает строку только если остатка хватает.
      -- row-lock варианта сериализует конкурентные оплаты за один вариант (анти-оверселл).
      update public.variants set stock = stock - rec.quantity
        where id = rec.variant_id and stock >= rec.quantity;
      if not found then
        raise exception 'Недостаточно остатка склада для варианта % (нужно %)',
          rec.variant_id, rec.quantity using errcode = 'check_violation';
      end if;
      insert into public.stock_movements (variant_id, delta, reason, order_id)
        values (rec.variant_id, -rec.quantity, 'order', p_order_id);
    end if;

    v_cogs := v_cogs + coalesce(rec.unit_cost, 0) * rec.quantity;

    if rec.print_owner_id is not null and rec.print_id is not null then
      select coalesce(dp.royalty_pct, pl.royalty_pct, 0) into v_rate
        from public.print_library pl
        left join public.designer_profiles dp on dp.id = rec.print_owner_id
        where pl.id = rec.print_id;
      v_base := rec.unit_price * rec.quantity;
      v_roy := round(v_base * coalesce(v_rate, 0) / 100, 2);
      v_royalty_total := v_royalty_total + v_roy;

      insert into public.royalty_earnings (designer_id, order_id, order_item_id, print_id, sale_base, rate_pct, amount, status)
        values (rec.print_owner_id, p_order_id, rec.id, rec.print_id, v_base, coalesce(v_rate, 0), v_roy, 'accrued');

      insert into public.designer_balances (designer_id, total_earned, available)
        values (rec.print_owner_id, v_roy, v_roy)
        on conflict (designer_id) do update
          set total_earned = public.designer_balances.total_earned + excluded.total_earned,
              available = public.designer_balances.available + excluded.available,
              updated_at = now();

      insert into public.finance_entries (entry_type, order_id, designer_id, amount, note)
        values ('royalty', p_order_id, rec.print_owner_id, v_roy, 'Роялти дизайнеру');
    end if;
  end loop;

  -- финансовый леджер заказа
  insert into public.finance_entries (entry_type, order_id, amount, note)
    values ('revenue', p_order_id, v_order.total, 'Выручка заказа');
  if v_cogs > 0 then
    insert into public.finance_entries (entry_type, order_id, amount, note)
      values ('cogs', p_order_id, v_cogs, 'Себестоимость заготовок');
  end if;

  insert into public.order_status_log (order_id, from_status, to_status, actor_id, note)
    values (p_order_id, v_order.status, 'paid', null, 'Оплата подтверждена (webhook)');

  return jsonb_build_object('already_paid', false, 'royalty_total', v_royalty_total);
end;
$$;

revoke all on function public.apply_paid(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_paid(uuid, text, jsonb) to service_role;
