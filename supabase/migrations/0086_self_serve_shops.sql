-- 0086: self-serve создание B2B-магазина (замена админ-шлюза «заявка → approve → claim»).
--
-- Было: заявитель оставлял заявку → админ вручную вбивал slug и долю → RPC admin_create_shop
-- резолвил владельца по email → если пользователя нет, выдавался claim_token и письмо.
-- Цепочка = 6 человеческих касаний и 3 ожидания; при этом уже зарегистрированный заявитель
-- НЕ получал вообще никакого уведомления (магазин создавался «мёртвым»).
--
-- Стало: владелец создаёт магазин сам — create_my_shop(name, slug) под своей сессией.
-- owner_id = auth.uid() сразу, claim-механика на этом пути не нужна вовсе. Модерация —
-- пост-фактум (админ уже умеет suspend/менять долю, Tier1 C). В проде 0 магазинов и 0
-- заявок на момент миграции, поэтому смена модели ничего не ломает.
--
-- Аддитивно и идемпотентно. Старые admin_create_shop/claim_shop НЕ трогаем — остаются
-- рабочими для ручного сценария (админ создаёт магазин чужому email).

-- ── Зарезервированные slug'и ────────────────────────────────────────────────
-- Расширяем список 0066: инфраструктурные метки (ns/mx/smtp/_acme-challenge…) критичны
-- на фазе B6 — субдомен магазина не должен перехватывать DNS/ACME-валидацию зоны, а
-- всё-числовые и xn-- метки ломают DNS-совместимость/дают гомоглиф-атаки на бренд.
-- Функция immutable и не используется ни в одном CHECK-constraint (только в RPC),
-- поэтому replace безопасен.
create or replace function public.is_reserved_shop_slug(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select
    p_slug in (
      -- системные пути платформы
      'www', 'api', 'admin', 'studio', 'studio-designer', 'designer', 'app', 'mail',
      'shop', 'shops', 'shop-admin', 'shop-new', 'shop-claim', 'cdn', 'static', 'assets',
      'account', 'business', 'catalog', 'cart', 'checkout', 'login', 'logout', 'register',
      'reset', 'forgot', 'order', 'orders', 'customize', 'invite', 'legal', 'profile',
      's', 'auth', 'blog', 'help', 'support', 'about', 'inkmade', 'contacts', 'faq',
      -- инфраструктура/DNS/почта (фаза B6: wildcard-субдомены)
      'ns', 'ns1', 'ns2', 'ns3', 'mx', 'mx1', 'mx2', 'smtp', 'imap', 'pop', 'pop3',
      'email', 'webmail', 'ftp', 'sftp', 'vpn', 'proxy', 'gateway', 'router',
      'dev', 'stage', 'staging', 'test', 'testing', 'preview', 'demo', 'sandbox',
      'status', 'docs', 'dashboard', 'panel', 'internal', 'private', 'secure',
      'm', 'mobile', 'web', 'server', 'host', 'localhost', 'root', 'system'
    )
    -- ACME/DNS-служебные метки (в т.ч. _acme-challenge — DNS-01 валидация зоны)
    or p_slug like '\_%'
    -- punycode-префикс: гомоглиф-домены под чужой бренд
    or p_slug like 'xn--%'
    -- полностью числовая метка: путается с IP-литералами, ломает часть резолверов
    or p_slug ~ '^[0-9]+$';
$$;

-- ── Доля магазина по умолчанию ──────────────────────────────────────────────
-- Колонка была default 0, а админка подставляла 15 лишь как placeholder-атрибут (не
-- предзаполняла поле) — админ, не тронувший поле, создавал магазин с долей 0%.
-- В self-serve долю никто не вводит, поэтому дефолт обязан быть боевым.
alter table public.shops alter column revenue_share_pct set default 15;

-- ── Проверка доступности slug (для живой подсказки в форме) ─────────────────
-- Возвращает {ok, reason}: invalid|reserved|taken|ok. Оракул перечисления магазинов
-- здесь не создаётся — витрины и так публичны по slug (shop_storefront для anon).
create or replace function public.shop_slug_available(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if public.is_reserved_shop_slug(v_slug) then
    return jsonb_build_object('ok', false, 'reason', 'reserved');
  end if;
  if exists (select 1 from public.shops where slug = v_slug) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;
  return jsonb_build_object('ok', true, 'reason', 'ok');
end;
$$;
revoke all on function public.shop_slug_available(text) from public, anon, authenticated;
grant execute on function public.shop_slug_available(text) to anon, authenticated;

-- ── Self-serve: создать СВОЙ магазин ────────────────────────────────────────
-- SECURITY DEFINER, т.к. RLS shops_admin_insert (0066) пускает INSERT только админу —
-- политику НЕ ослабляем, вся вставка идёт через эту проверенную точку.
-- Один магазин на пользователя: getMine()/middleware shop-owner исходят из одного
-- магазина, а лимит заодно сдерживает захват slug'ов.
create or replace function public.create_my_shop(p_name text, p_slug text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_slug  text := lower(trim(coalesce(p_slug, '')));
  v_name  text := nullif(trim(coalesce(p_name, '')), '');
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'forbidden';
  end if;
  if v_name is null then
    raise exception 'Укажите название магазина';
  end if;
  if length(v_name) > 120 then
    raise exception 'Слишком длинное название магазина';
  end if;
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'Некорректный адрес магазина';
  end if;
  if public.is_reserved_shop_slug(v_slug) then
    raise exception 'Этот адрес зарезервирован';
  end if;
  if exists (select 1 from public.shops where owner_id = v_uid) then
    raise exception 'У вас уже есть магазин';
  end if;
  if exists (select 1 from public.shops where slug = v_slug) then
    raise exception 'Этот адрес уже занят';
  end if;

  -- гонка двух параллельных запросов ловится unique-индексом shops.slug: транзакция
  -- упадёт на insert, а не создаст дубль (проверка выше — для человекочитаемой ошибки).
  insert into public.shops (slug, name, owner_id, revenue_share_pct)
  values (v_slug, v_name, v_uid, 15)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;
revoke all on function public.create_my_shop(text, text) from public, anon, authenticated;
grant execute on function public.create_my_shop(text, text) to authenticated;

-- ── Позиция витрины обязана быть покупаемой ─────────────────────────────────
-- Дыра: design_id nullable, а форма кабинета требовала лишь title+price. Позиция без
-- дизайна проходила все guard'ы, чеклист онбординга ставил галочки «товар»+«витрина
-- опубликована», витрина её показывала — но shop_item_buy_payload (0070) не мог
-- разрешить product/variant и возвращал null → покупатель получал «недоступно».
-- Заодно это чинило обход A4: пол себестоимости пропускался при неопределимом варианте.
-- Требуем: у активной позиции вариант обязан разрешаться (через дизайн или напрямую).
-- Проверки F3/F2/A4 сохранены дословно из 0076.
create or replace function public.guard_shop_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner        uuid;
  v_design_owner uuid;
  v_variant_id   uuid;
  v_blank        numeric;
  v_rate         numeric;
begin
  if new.design_id is not null then
    select owner_id into v_owner from public.shops where id = new.shop_id;
    select user_id into v_design_owner from public.designs where id = new.design_id;
    if v_owner is null or v_design_owner is null or v_design_owner <> v_owner then
      raise exception 'Публиковать можно только собственные дизайны';
    end if;
  end if;

  if new.is_active and coalesce(new.price, 0) + coalesce(new.markup, 0) <= 0 then
    raise exception 'У активной позиции цена должна быть больше 0';
  end if;

  if new.is_active then
    v_variant_id := coalesce(
      new.variant_id,
      (select variant_id from public.designs where id = new.design_id)
    );

    -- НОВОЕ: без разрешимого варианта позицию нельзя купить — не пускаем в витрину
    if v_variant_id is null then
      raise exception 'У активной позиции должен быть выбран дизайн';
    end if;

    -- A4: база (price) обязана покрывать себестоимость заготовки после доли платформы
    select coalesce(blank_cost, 0) into v_blank from public.variants where id = v_variant_id;
    select coalesce(revenue_share_pct, 0) into v_rate from public.shops where id = new.shop_id;
    if coalesce(v_blank, 0) > 0
       and coalesce(new.price, 0) * (100 - coalesce(v_rate, 0)) < coalesce(v_blank, 0) * 100 then
      raise exception 'Базовая цена позиции должна покрывать себестоимость заготовки';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.guard_shop_item() from public, anon, authenticated;
-- триггер trg_guard_shop_item (0069) привязан по имени функции — create or replace
-- сохраняет привязку, пересоздавать его не нужно.
