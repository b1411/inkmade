-- Сбор лидов: телефон + согласие на связь при регистрации.
-- Цель — копить контакты для связи в WhatsApp/звонком. Полноценная phone-OTP
-- авторизация НЕ вводится (требует платного SMS-провайдера); телефон собирается
-- как обязательное поле профиля.

-- 1) Согласие на маркетинговую связь (WhatsApp/звонки). Юр-согласия (tos/privacy)
--    остаются в user_consents; это отдельный, отзываемый маркетинговый opt-in.
alter table public.profiles
  add column if not exists marketing_consent boolean not null default false;

-- 2) Триггер создания профиля: переносим phone и согласие из user_metadata,
--    которые клиент кладёт при signUp (как уже делается для full_name).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.profiles (id, full_name, phone, marketing_consent)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- 3) admin_list_users: добавить phone и marketing_consent (для экрана лидов).
--    SECURITY DEFINER + внутренняя проверка is_admin сохранены. DROP нужен —
--    меняется RETURNS TABLE (нельзя CREATE OR REPLACE при смене типа результата).
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table(
  id uuid, email text, role text, full_name text,
  phone text, marketing_consent boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'Недостаточно прав'; end if;
  return query
    select p.id, u.email::text, p.role, p.full_name,
           p.phone, p.marketing_consent, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$function$;

comment on function public.admin_list_users() is
  'SECURITY DEFINER. EXECUTE для authenticated НАМЕРЕННО: внутренняя проверка private.is_admin(). НЕ REVOKE.';
