-- 0058: заменить definer-вьюху public_designer_profiles на SECURITY DEFINER-функцию.
-- Линтер 0010 (security_definer_view) поднимает ERROR на ЛЮБУЮ definer-вьюху. Нам нужна
-- definer-семантика (отдать анониму витрину в обход RLS, закрытой в 0057 до владельца/админа),
-- поэтому переносим проекцию в SECURITY DEFINER-функцию — это уже принятый в проекте паттерн
-- (studio_get_order/admin_* задокументированы в 0042). Функция отдаёт ТОЛЬКО безопасные
-- колонки публичного дизайнера; payout_details/tax_status/royalty_pct остаются приватными
-- (designer_profiles_read из 0057 = владелец/админ).
drop view if exists public.public_designer_profiles;

create or replace function public.public_designer_profile(p_id uuid)
returns table (id uuid, display_name text, bio text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, display_name, bio, avatar_url
  from public.designer_profiles
  where id = p_id and is_public = true;
$$;

-- доступ витрине (в т.ч. анониму — страница публичная); только чтение безопасной проекции
revoke all on function public.public_designer_profile(uuid) from public, anon, authenticated;
grant execute on function public.public_designer_profile(uuid) to anon, authenticated;
