-- 0077 — Гард целостности designer_profiles (аудит готовности 2026-07-07, HIGH).
--
-- Дыра: RLS-политика designer_profiles_self_update (0041) даёт дизайнеру UPDATE своей
-- строки БЕЗ ограничения колонок, а BEFORE-гарда на royalty_pct нет (был только
-- AFTER-audit trg_audit_royalty — он логирует, но не блокирует). apply_paid берёт
-- ставку как coalesce(designer_profiles.royalty_pct, ...), т.е. дизайнер прямым
-- PostgREST-PATCH мог поставить себе royalty_pct=99 в обход admin-only set_royalty_rate.
--
-- Фикс: BEFORE UPDATE триггер запрещает не-админу менять royalty_pct/status/invited_by
-- своей строки. Легитимные пути сохранены:
--   • set_royalty_rate — работает под auth.uid()=админ → private.is_admin() = true → пропуск;
--   • claim_designer_invite (SECURITY DEFINER под uid дизайнера) делает upsert royalty_pct
--     — для него вводим транзакционный флаг app.designer_write='on', который триггер
--     признаёт доверенным. Прямой PATCH клиента этот флаг выставить не может.
-- Профиль-самоправка (display_name/bio/avatar/payout_details/is_public) не затрагивает
-- гардируемые колонки → проходит свободно. Service-role (auth.uid() IS NULL) не гейтится.

create or replace function public.guard_designer_profile()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is not null
     and not private.is_admin()
     and coalesce(current_setting('app.designer_write', true), '') <> 'on'
     and ( new.royalty_pct is distinct from old.royalty_pct
        or new.status      is distinct from old.status
        or new.invited_by  is distinct from old.invited_by ) then
    raise exception 'Ставку роялти, статус и атрибуцию дизайнера меняет только администратор';
  end if;
  return new;
end;
$$;

-- триггер не вызывается напрямую клиентом
revoke all on function public.guard_designer_profile() from public, anon, authenticated;

drop trigger if exists trg_guard_designer_profile on public.designer_profiles;
create trigger trg_guard_designer_profile
  before update on public.designer_profiles
  for each row execute function public.guard_designer_profile();

-- Пересоздаём claim_designer_invite: единственное отличие — установка доверенного
-- флага app.designer_write перед upsert designer_profiles (тело в остальном идентично
-- боевому). Флаг транзакционный (is_local=true) — не утекает за пределы вызова.
create or replace function public.claim_designer_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
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

  if v_email is null or lower(v_email) <> lower(v_inv.email) then
    raise exception 'Приглашение оформлено на другой email';
  end if;

  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'Подтвердите email перед активацией приглашения';
  end if;

  update public.profiles set role = 'designer' where id = v_uid;

  -- доверенный путь смены royalty_pct/status: разрешаем гарду guard_designer_profile
  perform set_config('app.designer_write', 'on', true);

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
