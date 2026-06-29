-- INKMADE — миграция 0054: блокировка пользователей в админке (§8.1, расширение управления доступом)
-- Расширяем admin_list_users полем banned_until (из auth.users), чтобы админ видел,
-- кто заблокирован. Сама блокировка/разблокировка делается через Auth Admin API
-- на сервере (server/api/admin/users/ban.post.ts) — здесь только чтение статуса.
-- База — актуальное определение из 0043 (phone + marketing_consent, сортировка DESC),
-- его НЕЛЬЗЯ терять. Меняется RETURNS TABLE → требуется drop перед create.

drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table(
  id uuid, email text, role text, full_name text,
  phone text, marketing_consent boolean, created_at timestamptz,
  banned_until timestamptz
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  return query
    select p.id, u.email::text, p.role, p.full_name,
           p.phone, p.marketing_consent, p.created_at, u.banned_until
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$function$;

comment on function public.admin_list_users() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
