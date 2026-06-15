-- B2 (безопасность): сузить разрешённые типы публичного бакета design-uploads.
-- Ранее: ['image/*', 'image/svg+xml', 'application/pdf'] — wildcard + SVG позволяли
-- залить image/svg+xml с инлайн-скриптом в публичный бакет (XSS-вектор при прямом
-- открытии URL). Сужаем до конкретных растровых форматов + PDF. Это СЕРВЕРНАЯ
-- гарантия (Storage энфорсит allowed_mime_types на upload), дополняет клиентский
-- magic-bytes guard (app/utils/upload-guard.ts).
--
-- Наши собственные загрузки совместимы: composition (image/png), thumbnail
-- (image/webp), avatar (png/jpeg/webp), принты (растр/pdf).

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'application/pdf'
]::text[]
where id = 'design-uploads';
