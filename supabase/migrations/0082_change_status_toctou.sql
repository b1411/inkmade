-- 0082: TOCTOU-гард в change_order_status (аудит 2026-07-11).
--
-- ПРОБЛЕМА: переход валидируется в Node (status.post.ts) по статусу, который оператор
-- ПРОЧИТАЛ ранее, но применяется в RPC без ре-проверки под advisory-локом. Два оператора
-- на одном заказе могут сериализоваться в НЕВАЛИДНЫЙ переход по фактическому статусу —
-- напр. заказ уже ушёл в packing, а второй оператор жмёт «reprint» (валидно из printing,
-- но не из packing). RPC применял reprint вслепую → ложное списание брака (§8.3-8.4).
--
-- ФИКС: оптимистичный concurrency-гард. Сервер передаёт p_expected_from (статус, против
-- которого он валидировал переход); под локом сверяем его с фактическим — при расхождении
-- отклоняем (serialization_failure), оператор обновляет страницу. Обратная совместимость:
-- параметр с DEFAULT null → старый вызов из 6 аргументов работает как раньше (без гарда).
--
-- ⚠️ Тело change_order_status воспроизведено ДОСЛОВНО из 0009 — добавлен ТОЛЬКО параметр
-- p_expected_from и блок гарда после чтения заказа. Дропаем 6-арг версию и создаём 7-арг
-- (PostgREST зовёт её и с 6 именованными аргументами — недостающий берёт DEFAULT).

drop function if exists public.change_order_status(uuid, text, uuid, text, text, text);

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
  end if;

  return jsonb_build_object('from', v_order.status, 'to', p_to);
end;
$$;

revoke all on function public.change_order_status(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.change_order_status(uuid, text, uuid, text, text, text, text) to service_role;
