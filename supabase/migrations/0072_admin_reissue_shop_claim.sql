-- 0072: админ повторно выдаёт claim-ссылку магазину без владельца (Tier1 C).
-- Если владелец потерял ссылку или её нужно перевыпустить — генерируем новый
-- claim_token (только для магазина без owner_id). Смена status/revenue_share_pct
-- админом идёт напрямую через PostgREST (RLS shops_owner_update пускает is_admin,
-- guard_shops_update админа не блокирует) — отдельные RPC для них не нужны.
create or replace function public.admin_reissue_shop_claim(p_shop_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_email text;
  v_token text;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  select owner_id, claim_email into v_owner, v_email from public.shops where id = p_shop_id;
  if not found then raise exception 'магазин не найден'; end if;
  if v_owner is not null then raise exception 'у магазина уже есть владелец'; end if;
  if v_email is null then raise exception 'нет email заявки для привязки'; end if;

  v_token := replace(gen_random_uuid()::text, '-', '');
  update public.shops set claim_token = v_token where id = p_shop_id;

  return jsonb_build_object('claim_token', v_token, 'claim_email', v_email);
end;
$$;
revoke all on function public.admin_reissue_shop_claim(uuid) from public, anon, authenticated;
grant execute on function public.admin_reissue_shop_claim(uuid) to authenticated;
