-- 0059: добивка LOW-находок аудита (2026-06-30).
--   1) удалить мёртвый bump_promo_use (учёт промокода живёт в apply_paid с 0055) —
--      чтобы случайный вызов не дал двойной инкремент used_count.
--   2) request_payout: advisory-lock на дизайнера + учёт уже запрошенных заявок —
--      две параллельные заявки больше не суммарно превышают доступный баланс.
--   3) claim_designer_invite: требовать подтверждённый email — иначе регистрация на
--      чужой приглашённый email (без verify) могла бы захватить роль дизайнера.

-- ── 1. мёртвый bump_promo_use ───────────────────────────────────────
drop function if exists public.bump_promo_use(text);

-- ── 2. request_payout: lock + pending-aware проверка баланса ─────────
create or replace function public.request_payout(p_amount numeric, p_method text default null, p_details jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_avail numeric; v_pending numeric; v_id uuid;
begin
  if not private.is_designer() then raise exception 'Только дизайнер'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Некорректная сумма'; end if;

  -- сериализуем заявки одного дизайнера, чтобы гонка не создала заявки сверх баланса
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select available into v_avail from public.designer_balances where designer_id = auth.uid();
  -- уже запрошенные (ещё не выплаченные) заявки тоже резервируют баланс
  select coalesce(sum(amount), 0) into v_pending
    from public.payouts where designer_id = auth.uid() and status = 'requested';

  if coalesce(v_avail, 0) < v_pending + p_amount then
    raise exception 'Недостаточно доступного баланса';
  end if;

  insert into public.payouts (designer_id, amount, method, details, status)
    values (auth.uid(), p_amount, p_method, p_details, 'requested') returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.request_payout(numeric, text, jsonb) from public, anon;
grant execute on function public.request_payout(numeric, text, jsonb) to authenticated;

-- ── 3. claim_designer_invite: требовать подтверждённый email ─────────
create or replace function public.claim_designer_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.designer_invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text := auth.email();
begin
  if v_uid is null then raise exception 'Требуется вход'; end if;

  select * into v_inv from public.designer_invitations where token = p_token;
  if not found then raise exception 'Приглашение не найдено'; end if;
  if v_inv.status <> 'invited' then return jsonb_build_object('ok', false, 'reason', 'used'); end if;

  -- инвайт активируется только владельцем целевого email
  if v_email is null or lower(v_email) <> lower(v_inv.email) then
    raise exception 'Приглашение оформлено на другой email';
  end if;

  -- email обязан быть подтверждён: иначе регистрация на чужой приглашённый адрес
  -- (без верификации) могла бы заклеймить инвайт и получить роль дизайнера
  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'Подтвердите email перед активацией приглашения';
  end if;

  update public.profiles set role = 'designer' where id = v_uid;

  insert into public.designer_profiles (id, royalty_pct, invited_by, status)
    values (v_uid, v_inv.royalty_pct, v_inv.invited_by, 'active')
    on conflict (id) do update set royalty_pct = excluded.royalty_pct, status = 'active';

  insert into public.royalty_rate_history (designer_id, old_pct, new_pct, changed_by)
    values (v_uid, null, v_inv.royalty_pct, v_inv.invited_by);

  update public.designer_invitations
    set status = 'joined', joined_at = now() where id = v_inv.id;

  return jsonb_build_object('ok', true, 'royalty_pct', v_inv.royalty_pct);
end;
$$;
revoke all on function public.claim_designer_invite(text) from public, anon;
grant execute on function public.claim_designer_invite(text) to authenticated;
