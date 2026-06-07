-- INKMADE — миграция 0010: убрать листинг публичного бакета design-uploads (advisor)
-- Публичный бакет отдаёт файлы по public URL без SELECT-политики; широкая SELECT
-- позволяла перечислять все файлы. Тот же приём, что для 'catalog' в 0005.

drop policy if exists design_uploads_read_public on storage.objects;
