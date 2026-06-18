UPDATE wb_menus SET label = json_extract(translations, '$.en') WHERE json_extract(translations, '$.en') IS NOT NULL;
