-- Хардеринг по аудиту 2026-07-09: убрать лишнюю поверхность атаки.
-- admin_customer / admin_list_customers / admin_list_users — SECURITY DEFINER функции,
-- которые внутри гвардятся private.is_admin() и бросают исключение для не-админа.
-- Эксплойта нет, но EXECUTE был выдан псевдороли PUBLIC (дефолт Postgres при создании
-- функции), из-за чего их мог вызывать anon → 3 anon-warning'а в Supabase advisor и
-- лишняя поверхность. Отзываем у PUBLIC (это убирает anon), authenticated сохраняет
-- доступ через собственный явный грант. grant ниже — идемпотентная страховка на чистой БД.
revoke execute on function public.admin_customer(uuid)   from public;
revoke execute on function public.admin_list_customers() from public;
revoke execute on function public.admin_list_users()     from public;

grant execute on function public.admin_customer(uuid)   to authenticated;
grant execute on function public.admin_list_customers() to authenticated;
grant execute on function public.admin_list_users()     to authenticated;
