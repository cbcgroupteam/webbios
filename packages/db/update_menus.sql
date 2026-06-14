DELETE FROM wb_menus;
INSERT INTO wb_menus (id, parent_id, label, icon, path, permission_slug, position, is_system, translations) VALUES
('01KTC8SHPEESPJEDSK19MG72VC', NULL, 'Tổng quan', 'Home', '/', 'dashboard:view', 1, 1, '{"isCategory":false}'),
('01KTC8SHPEXXXXXXXXXXXXXXX1', NULL, 'KHO ỨNG DỤNG', NULL, '', NULL, 5, 1, '{"vi":"KHO ỨNG DỤNG","en":"APP STORE","isCategory":true}'),
('01KTC8SHPEXXXXXXXXXXXXXXX2', '01KTC8SHPEXXXXXXXXXXXXXXX1', 'Ứng dụng đã cài', 'Package', '/apps', 'apps:view', 6, 1, '{"isCategory":false}'),
('01KTC8SHPEXXXXXXXXXXXXXXX3', '01KTC8SHPEXXXXXXXXXXXXXXX1', 'Kho ứng dụng', 'Store', '/apps/store', 'apps:view', 7, 1, '{"isCategory":false}'),
('01KTC8SHPEV0W5WEHBHW506XY4', NULL, 'Thư viện media', 'Image', '/media', 'media:view', 8, 1, '{"isCategory":false}'),
('01KTC8SHPE2JKWW09BPE5ZS2XB', NULL, 'HỆ THỐNG', NULL, '', NULL, 10, 1, '{"vi":"HỆ THỐNG","en":"SYSTEM","isCategory":true}'),
('01KTC8SHPFVKGC64CS0K0487H0', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Người dùng', 'Users', '/users', 'users:view', 11, 1, '{"isCategory":false}'),
('01KTC8SHPFKJZJXYE03SFYXQMQ', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Menu', 'Menu', '/system/menus', 'menus:view', 12, 1, '{"isCategory":false}'),
('01KTC8SHPF5ACGYR0CRHRNVGVY', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Vai trò', 'Shield', '/system/roles', 'roles:view', 13, 1, '{"isCategory":false}'),
('01KTC8SHPG28BX293S61TPY8V5', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Phân quyền', 'Lock', '/system/permissions', 'permissions:view', 14, 1, '{"isCategory":false}'),
('01KTC8SHPGRCS9ZVBJ0YP6AZ6Z', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Nhật ký', 'FileText', '/audit', 'audit:view', 15, 1, '{"isCategory":false}'),
('01KTC8SHPG2K192J880B4J2B4W', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'Cài đặt', 'Settings', '/settings', 'settings:view', 16, 1, '{"isCategory":false}'),
('01KTC8SHPG2BNWZFZRN7HEKA0D', '01KTC8SHPE2JKWW09BPE5ZS2XB', 'API Keys', 'Key', '/api-keys', 'api_keys:view', 17, 1, '{"isCategory":false}'),
('01KTC8SHPEW5CV3VW84PM3ZHKJ', NULL, 'WEBBIOS', NULL, '', NULL, 20, 1, '{"vi":"WEBBIOS","en":"WEBBIOS","isCategory":true}'),
('01KTC8SHPGWRM08FJBTBMJ47NJ', '01KTC8SHPEW5CV3VW84PM3ZHKJ', 'Bản quyền', 'Circle', '/webbios/licenses', NULL, 21, 1, '{"isCategory":false}'),
('01KTC8SHPGA1DPRJ2JM2R54AYP', '01KTC8SHPEW5CV3VW84PM3ZHKJ', 'Cập nhật', 'CloudUpload', '/webbios/updates', NULL, 22, 1, '{"isCategory":false}');
