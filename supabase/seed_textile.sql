-- INKMADE — стартовый сид категории «Текстиль»: 6 черновиков-карточек по шаблонам
-- типов изделий (§6, каркас каталога). is_active=false — админ добавляет фото/остаток
-- и публикует. Числа размеров печати референсные (§10). Идемпотентно по slug.

do $$
declare
  v_pid uuid; v_mid uuid;
  rec record; color record; sz text;
begin
  for rec in
    select * from (values
      ('tshirt','Футболка',4990,300,420, array['S','M','L','XL','XXL'], array['chest','back','sleeve_left','sleeve_right'], 'Классическая хлопковая футболка, прямой крой.'),
      ('tshirt_oversize','Футболка оверсайз',6490,320,450, array['S','M','L','XL'], array['chest','back'], 'Свободный оверсайз-крой, спущенное плечо, плотный хлопок.'),
      ('polo','Поло',7990,250,300, array['S','M','L','XL','XXL'], array['chest','back'], 'Рубашка-поло с воротником, пике.'),
      ('sweatshirt','Свитшот',8990,300,400, array['S','M','L','XL','XXL'], array['chest','back'], 'Свитшот с начёсом, без капюшона.'),
      ('hoodie','Худи',10990,300,400, array['S','M','L','XL','XXL'], array['chest','back'], 'Худи с капюшоном и карманом-кенгуру, плотный футер.'),
      ('cap','Кепка',4490,120,80, array['OS'], array['cap_front'], 'Бейсболка, регулируемая застёжка, один размер.')
    ) as t(key,title,price,pw,ph,sizes,zones,descr)
  loop
    if exists (select 1 from products where slug = rec.key) then continue; end if;

    insert into products (slug, alias, title, category, base_price, is_active, max_print_mm, max_size_label, description)
    values (rec.key, rec.key, rec.title, 'textile', rec.price, false,
            jsonb_build_object('width', rec.pw, 'height', rec.ph),
            rec.sizes[array_upper(rec.sizes, 1)], rec.descr)
    returning id into v_pid;

    insert into materials (product_id, name, fabric_type, print_method, print_mode, surcharge)
    values (v_pid, 'Хлопок', 'cotton', 'dtg', 'zonal', 0) returning id into v_mid;

    for color in
      select * from (values
        ('Чёрный','#111111',1),('Белый','#FBF8F2',2),('Серый меланж','#9A9A9A',3),('Бордо','#7A1F28',4)
      ) as c(name,hex,ord)
      where rec.key <> 'cap' or c.ord <= 3
    loop
      foreach sz in array rec.sizes loop
        insert into variants (product_id, material_id, color_name, color_hex, size, sku, stock)
        values (v_pid, v_mid, color.name, color.hex, sz,
                upper(rec.key || '-' || replace(lower(color.name), ' ', '-') || '-' || sz), 0);
      end loop;
    end loop;

    if 'chest' = any(rec.zones) then
      insert into print_zones (product_id, print_mode, name, title, bounds_mm, max_width_mm, max_height_mm, min_dpi, placement_hint)
      values (v_pid,'zonal','chest','Грудь','{"x":55,"y":70,"width":200,"height":250}',200,250,150,'Основной рисунок чуть ниже центра груди.');
    end if;
    if 'back' = any(rec.zones) then
      insert into print_zones (product_id, print_mode, name, title, bounds_mm, max_width_mm, max_height_mm, min_dpi, placement_hint)
      values (v_pid,'zonal','back','Спина','{"x":50,"y":60,"width":300,"height":400}',300,400,150,'Крупный макет на спине.');
    end if;
    if 'sleeve_left' = any(rec.zones) then
      insert into print_zones (product_id, print_mode, name, title, bounds_mm, max_width_mm, max_height_mm, min_dpi, placement_hint)
      values (v_pid,'zonal','sleeve_left','Левый рукав','{"x":0,"y":0,"width":90,"height":120}',90,120,150,'Лого или короткая надпись.');
    end if;
    if 'sleeve_right' = any(rec.zones) then
      insert into print_zones (product_id, print_mode, name, title, bounds_mm, max_width_mm, max_height_mm, min_dpi, placement_hint)
      values (v_pid,'zonal','sleeve_right','Правый рукав','{"x":0,"y":0,"width":90,"height":120}',90,120,150,'Лого или короткая надпись.');
    end if;
    if 'cap_front' = any(rec.zones) then
      insert into print_zones (product_id, print_mode, name, title, bounds_mm, max_width_mm, max_height_mm, min_dpi, placement_hint)
      values (v_pid,'zonal','cap_front','Перёд кепки','{"x":0,"y":0,"width":120,"height":80}',120,80,150,'Лого по центру передней панели.');
    end if;
  end loop;
end $$;
