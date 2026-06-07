-- 0032: приглашения дизайнеров для закрытого старта опоры №2 (CRM §6.3, §7.5).
-- Админ создаёт инвайт с персональной ставкой → ссылка /register?invite=token →
-- после регистрации пользователь сам активирует роль дизайнера (claim RPC).

create table if not exists public.designer_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  royalty_pct numeric(5, 2) not null default 0,
  note text,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'invited' check (status in ('invited', 'joined', 'revoked')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  joined_at timestamptz
);
create index if not exists designer_invitations_token_idx on public.designer_invitations (token);

alter table public.designer_invitations enable row level security;

-- управление приглашениями — только admin
create policy designer_invitations_admin_all on public.designer_invitations for all
  using (private.is_admin()) with check (private.is_admin());

-- ── Активация приглашения зарегистрированным пользователем ──
-- SECURITY DEFINER: обходит RLS, чтобы выставить роль (profiles_update_self запрещает смену роли).
create or replace function public.claim_designer_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.designer_invitations%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Требуется вход'; end if;

  select * into v_inv from public.designer_invitations where token = p_token;
  if not found then raise exception 'Приглашение не найдено'; end if;
  if v_inv.status <> 'invited' then return jsonb_build_object('ok', false, 'reason', 'used'); end if;

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
