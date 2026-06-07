-- INKMADE — миграция 0008: бакет пользовательских загрузок дизайна (аудит C3)
-- Раньше оригинал принта жил как blob-URL во вкладке и терялся при её закрытии —
-- оператор не получал файл для печати. Теперь файл и скриншот композиции грузятся
-- в Storage сразу и переживают сессию.
--
-- Бакет публичный: гость собирает дизайн ДО логина (§9.1/§23.1), приватный бакет
-- (owner=auth.uid()) для гостя недоступен. Приватность оригиналов (§17.3) —
-- ужесточение во второй волне (подписанные URL + перенос в приватный designs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-uploads', 'design-uploads', true, 26214400,  -- 25 МБ (§7.4)
  array['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists design_uploads_read_public on storage.objects;
drop policy if exists design_uploads_insert_any on storage.objects;

-- публичное чтение (для отрисовки на холсте и скачивания оператором)
create policy design_uploads_read_public on storage.objects for select
  using (bucket_id = 'design-uploads');

-- запись доступна всем (вкл. гостя до логина); тип/размер ограничены бакетом
create policy design_uploads_insert_any on storage.objects for insert
  with check (bucket_id = 'design-uploads');
