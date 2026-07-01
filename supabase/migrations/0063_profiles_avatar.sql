-- 0063: аватар клиента (Фаза C4). Аддитивно, идемпотентно.
-- Файл кладём в существующий публичный бакет design-uploads по пути avatars/<uid>/…
-- (тот же, что у дизайнера) — новый бакет/политики не нужны. Здесь только колонка URL.
alter table public.profiles add column if not exists avatar_url text;
