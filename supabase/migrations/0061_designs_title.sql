-- 0061: имя сохранённого дизайна (Фаза C2). Аддитивно и идемпотентно.
-- Колонка title — пользовательское имя дизайна в кабинете (rename). При пустом
-- значении в UI показываем название товара. Обновление title идёт прямым UPDATE
-- под designs_owner_all (0004/0041); guard_design_moderation (0018) пропускает —
-- moderation_status не меняется.
alter table public.designs add column if not exists title text;
