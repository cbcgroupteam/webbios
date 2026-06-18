UPDATE wb_menus SET is_category = 1 WHERE json_extract(translations, '$.isCategory') = 1;
UPDATE wb_menus SET translations = json_remove(translations, '$.isCategory');
