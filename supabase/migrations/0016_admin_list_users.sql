-- INKMADE — миграция 0016: список пользователей для админки (§8.2, управление ролями)
-- email лежит в auth.users (недоступна клиенту), поэтому отдаём через RPC.
-- Смена роли делается обычным UPDATE profiles (политика profiles_admin_all).

create or replace function public.admin_list_users()
returns table (id uuid, email text, role text, full_name text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  return query
    select p.id, u.email::text, p.role, p.full_name, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
