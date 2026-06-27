-- 0047: привязка приглашения дизайнера к email (фикс эскалации роли).
-- Раньше claim_designer_invite(token) выдавал роль 'designer' любому
-- залогиненному, кто предъявит токен. Утёкшая/пересланная ссылка
-- /invite/[token] = чужой аккаунт становится дизайнером. Теперь токен
-- активируется только аккаунтом с тем же email, что и в приглашении.

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

  update public.profiles set role = 'designer' where id = v_uid;

  insert into public.designer_profiles (id, royalty_pct, invited_by, status)
    values (v_uid, v_inv.royalty_pct, v_inv.invited_by, 'active')
    on conflict (id) do update set royalty_pct = excluded.royalty_pct, status = 'active';

  -- фиксируем персональную ставку в истории (без пересчёта прошлого)
  insert into public.royalty_rate_history (designer_id, old_pct, new_pct, changed_by)
    values (v_uid, null, v_inv.royalty_pct, v_inv.invited_by);

  update public.designer_invitations
    set status = 'joined', joined_at = now() where id = v_inv.id;

  return jsonb_build_object('ok', true, 'royalty_pct', v_inv.royalty_pct);
end;
$$;

revoke all on function public.claim_designer_invite(text) from public, anon;
grant execute on function public.claim_designer_invite(text) to authenticated;
