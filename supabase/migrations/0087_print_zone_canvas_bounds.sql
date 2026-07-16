-- 0087 — калибровка зоны печати в координатах холста.
--
-- ЗАЧЕМ. Кастомайзер рисовал рамку зоны не там и не того размера: useDesign.rectFor()
-- вписывал зону в холст (минус паддинг) и центрировал, полностью игнорируя bounds_mm.
-- Для груди футболки (bounds_mm {x:55,y:70}, 200×250 мм) выходило 374×468 px в точке
-- (43,36) вместо 122×172 в (154,198) — втрое крупнее и не на груди. Печатный файл при
-- этом считался верно (200 мм @300dpi = 2362 px), то есть врало ИМЕННО превью:
-- человек ставил принт во всю рамку, а приезжала треть печатного поля.
--
-- ПОЧЕМУ НЕ ПОЧИНИЛИ ФОРМУЛОЙ. Прежняя модель (garment.ts GARMENT_PRINT_FRAME:
-- bodyPx + frameMm + bounds_mm) неисправима на месте по двум причинам:
--   1) она противоречива сама по себе: bodyPx 220×330 (0.667) под frameMm 360×480
--      (0.75) → масштаб мм↔px разный по осям, круг на экране стал бы эллипсом в печати;
--   2) она откалибрована под ВЕКТОРНЫЙ СИЛУЭТ, а холст показывает реальное фото товара
--      (cover-fit, обрезка по бокам) — у них разные системы координат.
--
-- РЕШЕНИЕ. Храним прямоугольник зоны прямо в НОРМАЛИЗОВАННЫХ координатах холста
-- кастомайзера (0..1 от 460×540). Админ калибрует зону поверх того же изображения,
-- которое видит покупатель, — что нарисовал, то и правда. Физический масштаб
-- (px↔мм) выводится из max_width_mm и ширины этого же прямоугольника, поэтому он
-- по определению единый по обеим осям.
--
-- Колонка nullable и НЕ трогает данные: пока она пуста, кастомайзер работает по
-- старой формуле. Это позволяет калибровать товары по одному, а не всё разом.
-- bounds_mm остаётся: на него завязана админка, снимаем его отдельным шагом.

alter table public.print_zones
  add column if not exists bounds_canvas jsonb;

comment on column public.print_zones.bounds_canvas is
  'Прямоугольник зоны в нормализованных координатах холста кастомайзера (0..1 от 460x540): {"x":0.33,"y":0.28,"width":0.27,"height":0.32}. NULL = зона не откалибрована, кастомайзер падает на старую формулу. Физический масштаб мм↔px = width*460 / max_width_mm.';

-- Форма значения проверяется на уровне БД: битая калибровка ломает превью молча,
-- а поймать её потом по кривому принту в цеху — дорого.
--
-- coalesce(jsonb_typeof(...), '') — не украшение. Для ОТСУТСТВУЮЩЕГО ключа
-- `bounds_canvas -> 'height'` даёт SQL NULL, jsonb_typeof(NULL) → NULL, а
-- `NULL = 'number'` → NULL. CHECK пропускает всё, что не FALSE, поэтому объект
-- без height проходил бы насквозь (проверено: проходил). coalesce сводит NULL к ''.
alter table public.print_zones
  drop constraint if exists print_zones_bounds_canvas_shape;

alter table public.print_zones
  add constraint print_zones_bounds_canvas_shape check (
    bounds_canvas is null or (
      jsonb_typeof(bounds_canvas) = 'object'
      and coalesce(jsonb_typeof(bounds_canvas -> 'x'), '') = 'number'
      and coalesce(jsonb_typeof(bounds_canvas -> 'y'), '') = 'number'
      and coalesce(jsonb_typeof(bounds_canvas -> 'width'), '') = 'number'
      and coalesce(jsonb_typeof(bounds_canvas -> 'height'), '') = 'number'
      and (bounds_canvas ->> 'x')::numeric between 0 and 1
      and (bounds_canvas ->> 'y')::numeric between 0 and 1
      and (bounds_canvas ->> 'width')::numeric > 0
      and (bounds_canvas ->> 'height')::numeric > 0
      and (bounds_canvas ->> 'x')::numeric + (bounds_canvas ->> 'width')::numeric <= 1.0001
      and (bounds_canvas ->> 'y')::numeric + (bounds_canvas ->> 'height')::numeric <= 1.0001
    )
  );

