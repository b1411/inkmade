-- 0064: закрытие находок аудита (сессионные баги). Аддитивно, идемпотентно.
--   1) order_requests: insert-политика теперь проверяет СТАТУС заказа (клиент не может
--      подать cancel/return на неподходящий статус в обход клиентских гейтов);
--   2) order_requests: guard-триггер иммутабельности order_id/user_id/kind при staff-UPDATE;
--   3) order_requests: индекс на resolved_by (unindexed FK);
--   4) anonymize_account(): атомарная анонимизация данных клиента для /api/account/delete
--      (включая avatar_url, который прежде пропускался).

-- ── 1. Insert-политика заявок с проверкой статуса заказа (зеркалит клиентские гейты) ──
drop policy if exists order_requests_owner_insert on public.order_requests;
create policy order_requests_owner_insert on public.order_requests for insert
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and resolved_at is null
    and resolved_by is null
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
        and (
          (kind = 'cancel' and o.status in ('created', 'pending', 'paid', 'queued'))
          or (kind = 'return' and o.status = 'delivered')
        )
    )
  );

-- ── 2. Иммутабельность order_id/user_id/kind при клиентском (staff) UPDATE ──
create or replace function public.guard_order_request_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if new.order_id is distinct from old.order_id
       or new.user_id is distinct from old.user_id
       or new.kind    is distinct from old.kind then
      raise exception 'order_id/user_id/kind заявки неизменяемы';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_order_request_update() from public, anon, authenticated;
drop trigger if exists trg_guard_order_request_update on public.order_requests;
create trigger trg_guard_order_request_update before update on public.order_requests
  for each row execute function public.guard_order_request_update();

-- ── 3. Индекс на resolved_by (unindexed FK) ──
create index if not exists order_requests_resolved_by_idx on public.order_requests (resolved_by);

-- ── 4. Атомарная анонимизация аккаунта клиента (GDPR, Фаза C4) ──
-- Все табличные мутации в одной транзакции функции; включает avatar_url (пропускался
-- в delete.post.ts). Storage-файл аватара чистит серверный эндпоинт (best-effort).
create or replace function public.anonymize_account(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.addresses  where user_id = p_uid;
  delete from public.favorites  where user_id = p_uid;
  delete from public.cart_items where user_id = p_uid;
  delete from public.designs    where user_id = p_uid and is_saved = true;
  update public.profiles
    set full_name = null, phone = null, marketing_consent = false, avatar_url = null
    where id = p_uid;
end;
$$;
revoke all on function public.anonymize_account(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_account(uuid) to service_role;
