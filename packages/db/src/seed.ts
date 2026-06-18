import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { ulid } from 'ulid';

/**
 * SEED DATA — Core Kernel (wb_* tables)
 *
 * Seeds: roles, permissions, role-permissions mapping, menus, admin user, default settings.
 * Suite-specific permissions (products, orders, etc.) are NOT here — they are
 * registered dynamically when a Suite is installed.
 */
export async function seed(env: { DB: D1Database }) {
  const db = drizzle(env.DB, { schema });

  console.log('🌱 Seeding Core Kernel Database...');

  try {
    // ============================================================
    // 1. Roles
    // ============================================================
    console.log('  → Seeding roles...');
    const ownerRoleId = ulid();
    const adminRoleId = ulid();
    const staffRoleId = ulid();
    const customerRoleId = ulid();

    const rolesData = [
      { id: ownerRoleId, name: 'Chủ sở hữu', slug: 'owner', description: 'Toàn quyền. Không thể xóa hoặc thu hồi quyền.', isSystem: true },
      { id: adminRoleId, name: 'Quản trị viên', slug: 'admin', description: 'Gần toàn quyền. Không thể quản lý Owner.', isSystem: true },
      { id: staffRoleId, name: 'Nhân viên', slug: 'staff', description: 'Xem/xử lý tác vụ theo quyền được gán.', isSystem: true },
      { id: customerRoleId, name: 'Khách hàng', slug: 'customer', description: 'Tài khoản khách hàng đăng ký từ storefront.', isSystem: true },
    ];

    for (const role of rolesData) {
      await db.insert(schema.wbRoles).values(role).onConflictDoNothing();
    }

    // ============================================================
    // 2. Core Permissions (Only system-level, NOT suite-specific)
    // ============================================================
    console.log('  → Seeding core permissions...');
    const permissionsData = [
      // Dashboard
      { slug: 'dashboard:view', name: 'Xem tổng quan', groupName: 'dashboard', sortOrder: 1 },
      // Settings
      { slug: 'settings:view', name: 'Xem cài đặt', groupName: 'settings', sortOrder: 1 },
      { slug: 'settings:edit', name: 'Sửa cài đặt', groupName: 'settings', sortOrder: 2 },
      // Users
      { slug: 'users:view', name: 'Xem người dùng', groupName: 'users', sortOrder: 1 },
      { slug: 'users:manage', name: 'Quản lý người dùng', groupName: 'users', sortOrder: 2 },
      // Media
      { slug: 'media:view', name: 'Xem thư viện media', groupName: 'media', sortOrder: 1 },
      { slug: 'media:upload', name: 'Upload file', groupName: 'media', sortOrder: 2 },
      { slug: 'media:delete', name: 'Xóa file', groupName: 'media', sortOrder: 3 },
      // Apps
      { slug: 'apps:view', name: 'Xem ứng dụng', groupName: 'apps', sortOrder: 1 },
      { slug: 'apps:manage', name: 'Cài đặt/Gỡ ứng dụng', groupName: 'apps', sortOrder: 2 },
      // API Keys
      { slug: 'api_keys:view', name: 'Xem API keys', groupName: 'api_keys', sortOrder: 1 },
      { slug: 'api_keys:manage', name: 'Quản lý API keys', groupName: 'api_keys', sortOrder: 2 },
      // System
      { slug: 'roles:view', name: 'Xem vai trò', groupName: 'system', sortOrder: 1 },
      { slug: 'roles:manage', name: 'Quản lý vai trò', groupName: 'system', sortOrder: 2 },
      { slug: 'permissions:view', name: 'Xem quyền', groupName: 'system', sortOrder: 3 },
      { slug: 'permissions:manage', name: 'Quản lý quyền', groupName: 'system', sortOrder: 4 },
      { slug: 'menus:view', name: 'Xem menu', groupName: 'system', sortOrder: 5 },
      { slug: 'menus:manage', name: 'Quản lý menu', groupName: 'system', sortOrder: 6 },
      // Audit
      { slug: 'audit:view', name: 'Xem nhật ký hoạt động', groupName: 'audit', sortOrder: 1 },
    ];

    const insertedPermissions: { id: string; slug: string }[] = [];

    for (const p of permissionsData) {
      const pId = ulid();
      await db.insert(schema.wbPermissions).values({ id: pId, ...p }).onConflictDoNothing();
      const dbPerm = await db.select().from(schema.wbPermissions).where(sql`slug = ${p.slug}`).limit(1);
      if (dbPerm.length > 0) {
        insertedPermissions.push({ id: dbPerm[0].id, slug: dbPerm[0].slug });
      }
    }

    // ============================================================
    // 3. Role ↔ Permission Mapping
    // ============================================================
    console.log('  → Assigning role permissions...');

    const getRole = async (slug: string) => {
      const res = await db.select().from(schema.wbRoles).where(sql`slug = ${slug}`).limit(1);
      return res[0]?.id;
    };

    const ownerId = await getRole('owner');
    const adminId = await getRole('admin');
    const staffId = await getRole('staff');

    if (ownerId && adminId && staffId) {
      for (const p of insertedPermissions) {
        // Owner gets everything
        await db.insert(schema.wbRolePermissions).values({ roleId: ownerId, permissionId: p.id }).onConflictDoNothing();

        // Admin gets everything except users:manage
        if (p.slug !== 'users:manage') {
          await db.insert(schema.wbRolePermissions).values({ roleId: adminId, permissionId: p.id }).onConflictDoNothing();
        }

        // Staff gets only view permissions
        if (p.slug.endsWith(':view')) {
          await db.insert(schema.wbRolePermissions).values({ roleId: staffId, permissionId: p.id }).onConflictDoNothing();
        }
      }
    }

    // ============================================================
    // 4. Core Menus (Dashboard sidebar — system-level only)
    // ============================================================
    console.log('  → Seeding menus...');
    await db.delete(schema.wbMenus);
    const getPermId = (slug: string) => insertedPermissions.find(p => p.slug === slug)?.id;

    const systemMenuId = ulid();
    const storefrontMenuId = ulid();
    const webbiosMenuId = ulid();
    
    // System Sub-Categories
    const securityMenuId = ulid();
    const advancedMenuId = ulid();
    const settingsMenuId = ulid();

    const menusData = [
      // Top Level
      { id: ulid(), label: 'Dashboard', icon: 'Home', path: '/', permissionSlug: 'dashboard:view', appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Dashboard', 'en-US': 'Dashboard', 'en-GB': 'Dashboard', vi: 'Tổng quan', es: 'Panel', fr: 'Tableau de Bord', de: 'Dashboard', id: 'Dasbor', th: 'แดชบอร์ด', 'zh-CN': '仪表板', 'zh-TW': '儀表板', ja: 'ダッシュボード', ko: '대시보드' } },
      
      // Storefront Category
      { id: storefrontMenuId, label: 'STOREFRONT', icon: null, path: '', permissionSlug: null, appSlug: null, position: 2, isSystem: true, isCategory: true, translations: { en: 'STOREFRONT', 'en-US': 'STOREFRONT', 'en-GB': 'STOREFRONT', vi: 'KÊNH BÁN HÀNG', es: 'ESCAPARATE', fr: 'VITRINE', de: 'SCHAUFENSTER', id: 'ETALASE', th: 'หน้าร้าน', 'zh-CN': '店面', 'zh-TW': '店面', ja: 'ストアフロント', ko: '스토어프론트' } },
      { id: ulid(), parentId: storefrontMenuId, label: 'Media Library', icon: 'Image', path: '/media', permissionSlug: 'media:view', appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Media Library', 'en-US': 'Media Library', 'en-GB': 'Media Library', vi: 'Thư viện media', es: 'Biblioteca de Medios', fr: 'Médiathèque', de: 'Mediathek', id: 'Pustaka Media', th: 'คลังสื่อ', 'zh-CN': '媒体库', 'zh-TW': '媒體庫', ja: 'メディアライブラリ', ko: '미디어 라이브러리' } },

      // System Menu Category
      { id: systemMenuId, label: 'SYSTEM', icon: null, path: '', permissionSlug: null, appSlug: null, position: 10, isSystem: true, isCategory: true, translations: { en: 'SYSTEM', 'en-US': 'SYSTEM', 'en-GB': 'SYSTEM', vi: 'HỆ THỐNG', es: 'SISTEMA', fr: 'SYSTÈME', de: 'SYSTEM', id: 'SISTEM', th: 'ระบบ', 'zh-CN': '系统', 'zh-TW': '系統', ja: 'システム', ko: '시스템' } },
      
      // System > Security
      { id: securityMenuId, parentId: systemMenuId, label: 'Access Control', icon: 'ShieldCheck', path: '', permissionSlug: null, appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Access Control', 'en-US': 'Access Control', 'en-GB': 'Access Control', vi: 'Bảo mật & Phân quyền', es: 'Control de Acceso', fr: "Contrôle d'Accès", de: 'Zugangskontrolle', id: 'Kontrol Akses', th: 'การควบคุมการเข้าถึง', 'zh-CN': '访问控制', 'zh-TW': '存取控制', ja: 'アクセス制御', ko: '액세스 제어' } },
      { id: ulid(), parentId: securityMenuId, label: 'Users', icon: 'Users', path: '/users', permissionSlug: 'users:view', appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Users', 'en-US': 'Users', 'en-GB': 'Users', vi: 'Người dùng', es: 'Usuarios', fr: 'Utilisateurs', de: 'Benutzer', id: 'Pengguna', th: 'ผู้ใช้', 'zh-CN': '用户', 'zh-TW': '使用者', ja: 'ユーザー', ko: '사용자' } },
      { id: ulid(), parentId: securityMenuId, label: 'Roles', icon: 'Shield', path: '/system/roles', permissionSlug: 'roles:view', appSlug: null, position: 2, isSystem: true, isCategory: false, translations: { en: 'Roles', 'en-US': 'Roles', 'en-GB': 'Roles', vi: 'Vai trò', es: 'Roles', fr: 'Rôles', de: 'Rollen', id: 'Peran', th: 'บทบาท', 'zh-CN': '角色', 'zh-TW': '角色', ja: 'ロール', ko: '역할' } },
      { id: ulid(), parentId: securityMenuId, label: 'Permissions', icon: 'Lock', path: '/system/permissions', permissionSlug: 'permissions:view', appSlug: null, position: 3, isSystem: true, isCategory: false, translations: { en: 'Permissions', 'en-US': 'Permissions', 'en-GB': 'Permissions', vi: 'Phân quyền', es: 'Permisos', fr: 'Permissions', de: 'Berechtigungen', id: 'Izin', th: 'สิทธิ์', 'zh-CN': '权限', 'zh-TW': '權限', ja: '権限', ko: '권한' } },
      { id: ulid(), parentId: securityMenuId, label: 'API Keys', icon: 'Key', path: '/api-keys', permissionSlug: 'api_keys:view', appSlug: null, position: 4, isSystem: true, isCategory: false, translations: { en: 'API Keys', 'en-US': 'API Keys', 'en-GB': 'API Keys', vi: 'API Keys', es: 'Claves API', fr: 'Clés API', de: 'API-Schlüssel', id: 'Kunci API', th: 'คีย์ API', 'zh-CN': 'API 密钥', 'zh-TW': 'API 金鑰', ja: 'API キー', ko: 'API 키' } },

      // System > Advanced
      { id: advancedMenuId, parentId: systemMenuId, label: 'Advanced', icon: 'TerminalSquare', path: '', permissionSlug: null, appSlug: null, position: 2, isSystem: true, isCategory: false, translations: { en: 'Advanced', 'en-US': 'Advanced', 'en-GB': 'Advanced', vi: 'Nâng cao', es: 'Avanzado', fr: 'Avancé', de: 'Erweitert', id: 'Lanjutan', th: 'ขั้นสูง', 'zh-CN': '高级', 'zh-TW': '進階', ja: '高度な設定', ko: '고급' } },
      { id: ulid(), parentId: advancedMenuId, label: 'Menus', icon: 'Menu', path: '/system/menus', permissionSlug: 'menus:view', appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Menus', 'en-US': 'Menus', 'en-GB': 'Menus', vi: 'Menu', es: 'Menús', fr: 'Menus', de: 'Menüs', id: 'Menu', th: 'เมนู', 'zh-CN': '菜单', 'zh-TW': '選單', ja: 'メニュー', ko: '메뉴' } },
      { id: ulid(), parentId: advancedMenuId, label: 'Audit Logs', icon: 'FileText', path: '/audit', permissionSlug: 'audit:view', appSlug: null, position: 2, isSystem: true, isCategory: false, translations: { en: 'Audit Logs', 'en-US': 'Audit Logs', 'en-GB': 'Audit Logs', vi: 'Nhật ký', es: 'Registros de Auditoría', fr: "Journaux d'Audit", de: 'Audit-Protokolle', id: 'Log Audit', th: 'บันทึกการตรวจสอบ', 'zh-CN': '审计日志', 'zh-TW': '稽核日誌', ja: '監査ログ', ko: '감사 로그' } },
      { id: ulid(), parentId: advancedMenuId, label: 'Cron Jobs', icon: 'Clock', path: '/system/cron-jobs', permissionSlug: 'settings:view', appSlug: null, position: 3, isSystem: true, isCategory: false, translations: { en: 'Cron Jobs', 'en-US': 'Cron Jobs', 'en-GB': 'Cron Jobs', vi: 'Cron Jobs', es: 'Trabajos Cron', fr: 'Tâches Cron', de: 'Cron-Jobs', id: 'Pekerjaan Cron', th: 'ครอนจ็อบ', 'zh-CN': '定时任务', 'zh-TW': '排程工作', ja: 'クーロンジョブ', ko: '크론 작업' } },

      // System > Settings
      { id: settingsMenuId, parentId: systemMenuId, label: 'Settings', icon: 'Settings', path: '', permissionSlug: 'settings:view', appSlug: null, position: 3, isSystem: true, isCategory: false, translations: { en: 'Settings', 'en-US': 'Settings', 'en-GB': 'Settings', vi: 'Cài đặt', es: 'Ajustes', fr: 'Paramètres', de: 'Einstellungen', id: 'Pengaturan', th: 'การตั้งค่า', 'zh-CN': '设置', 'zh-TW': '設定', ja: '設定', ko: '설정' } },
      { id: ulid(), parentId: settingsMenuId, label: 'System', icon: null, path: '/settings', permissionSlug: 'settings:view', appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'System', 'en-US': 'System', 'en-GB': 'System', vi: 'Hệ thống', es: 'Sistema', fr: 'Système', de: 'System', id: 'Sistem', th: 'ระบบ', 'zh-CN': '系统', 'zh-TW': '系統', ja: 'システム', ko: '시스템' } },
      { id: ulid(), parentId: settingsMenuId, label: 'Domains', icon: null, path: '/settings/domains', permissionSlug: 'settings:view', appSlug: null, position: 2, isSystem: true, isCategory: false, translations: { en: 'Domains', 'en-US': 'Domains', 'en-GB': 'Domains', vi: 'Tên miền', es: 'Dominios', fr: 'Domaines', de: 'Domains', id: 'Domain', th: 'โดเมน', 'zh-CN': '域名', 'zh-TW': '網域', ja: 'ドメイン', ko: '도메인' } },
      { id: ulid(), parentId: settingsMenuId, label: 'Webhooks', icon: null, path: '/settings/webhooks', permissionSlug: 'settings:view', appSlug: null, position: 3, isSystem: true, isCategory: false, translations: { en: 'Webhooks', 'en-US': 'Webhooks', 'en-GB': 'Webhooks', vi: 'Webhooks', es: 'Webhooks', fr: 'Webhooks', de: 'Webhooks', id: 'Webhooks', th: 'เว็บฮุค', 'zh-CN': 'Webhooks', 'zh-TW': 'Webhooks', ja: 'Webhook', ko: '웹훅' } },

      // WebbiOS Category
      { id: webbiosMenuId, label: 'WEBBIOS', icon: null, path: '', permissionSlug: null, appSlug: null, position: 20, isSystem: true, isCategory: true, translations: { en: 'WEBBIOS', 'en-US': 'WEBBIOS', 'en-GB': 'WEBBIOS', vi: 'WEBBIOS', es: 'WEBBIOS', fr: 'WEBBIOS', de: 'WEBBIOS', id: 'WEBBIOS', th: 'WEBBIOS', 'zh-CN': 'WEBBIOS', 'zh-TW': 'WEBBIOS', ja: 'WEBBIOS', ko: 'WEBBIOS' } },
      { id: ulid(), parentId: webbiosMenuId, label: 'Backup & Restore', icon: 'DatabaseBackup', path: '/webbios/backup-restore', permissionSlug: null, appSlug: null, position: 1, isSystem: true, isCategory: false, translations: { en: 'Backup & Restore', 'en-US': 'Backup & Restore', 'en-GB': 'Backup & Restore', vi: 'Sao lưu & Khôi phục', es: 'Copia de Seguridad y Restauración', fr: 'Sauvegarde et Restauration', de: 'Sicherung & Wiederherstellung', id: 'Cadangan & Pemulihan', th: 'สำรอง & คืนค่า', 'zh-CN': '备份与恢复', 'zh-TW': '備份與還原', ja: 'バックアップと復元', ko: '백업 및 복원' } },
      { id: ulid(), parentId: webbiosMenuId, label: 'Cloudflare Quotas', icon: 'PieChart', path: '/webbios/cloudflare-quotas', permissionSlug: null, appSlug: null, position: 2, isSystem: true, isCategory: false, translations: { en: 'Cloudflare Quotas', 'en-US': 'Cloudflare Quotas', 'en-GB': 'Cloudflare Quotas', vi: 'Hạn mức Cloudflare', es: 'Cuotas de Cloudflare', fr: 'Quotas Cloudflare', de: 'Cloudflare-Kontingente', id: 'Kuota Cloudflare', th: 'โควต้า Cloudflare', 'zh-CN': 'Cloudflare 配额', 'zh-TW': 'Cloudflare 配額', ja: 'Cloudflare クォータ', ko: 'Cloudflare 할당량' } },
      { id: ulid(), parentId: webbiosMenuId, label: 'Updates', icon: 'CloudUpload', path: '/webbios/updates', permissionSlug: null, appSlug: null, position: 3, isSystem: true, isCategory: false, translations: { en: 'Updates', 'en-US': 'Updates', 'en-GB': 'Updates', vi: 'Cập nhật', es: 'Actualizaciones', fr: 'Mises à jour', de: 'Updates', id: 'Pembaruan', th: 'การอัปเดต', 'zh-CN': '更新', 'zh-TW': '更新', ja: 'アップデート', ko: '업데이트' } },
    ];

    for (const menu of menusData) {
      await db.insert(schema.wbMenus).values(menu).onConflictDoNothing();
    }

    // ============================================================
    // 5. Admin User (Owner)
    // ============================================================
    console.log('  → Seeding admin user...');
    const ownerRoleRows = await db.select().from(schema.wbRoles).where(sql`slug = 'owner'`).limit(1);
    const actualOwnerRoleId = ownerRoleRows[0]?.id;

    if (actualOwnerRoleId) {
      const passwordHash = '79cc643099214bc7f013265f6f2a757e:4241edfa8e52f23dd86e79dc386ee0f902eb61a83641ba0a1c64a620fb2fd21f'; // password123
      await db.insert(schema.wbUsers).values({
        id: ulid(),
        email: 'admin@webbios.local',
        passwordHash,
        firstName: 'Webbi',
        lastName: 'Admin',
        roleId: actualOwnerRoleId,
        status: 'active',
      }).onConflictDoNothing();
    }

    // ============================================================
    // 6. Default Settings
    // ============================================================
    console.log('  → Seeding default settings...');
    const settingsData = [
      { key: 'site.name', value: JSON.stringify('My WebbiOS Site'), groupName: 'site' },
      { key: 'site.description', value: JSON.stringify('Powered by WebbiOS'), groupName: 'site' },
      { key: 'site.locale', value: JSON.stringify('vi'), groupName: 'site' },
      { key: 'site.timezone', value: JSON.stringify('Asia/Ho_Chi_Minh'), groupName: 'site' },
      { key: 'site.currency', value: JSON.stringify('VND'), groupName: 'site' },
      { key: 'site.measurement', value: JSON.stringify('kg'), groupName: 'site' },
      { key: 'security.require_2fa', value: JSON.stringify(false), groupName: 'system' },
      { key: 'security.password_policy', value: JSON.stringify('medium'), groupName: 'system' },
      { key: 'smtp.host', value: JSON.stringify(''), groupName: 'system' },
      { key: 'smtp.port', value: JSON.stringify('587'), groupName: 'system' },
      { key: 'smtp.user', value: JSON.stringify(''), groupName: 'system' },
      { key: 'smtp.pass', value: JSON.stringify(''), groupName: 'system' },
      { key: 'smtp.from', value: JSON.stringify(''), groupName: 'system' },
      { key: 'format.order_prefix', value: JSON.stringify('ORD-'), groupName: 'system' },
      { key: 'format.invoice_prefix', value: JSON.stringify('INV-'), groupName: 'system' },
      { key: 'system.license_plan', value: JSON.stringify('free'), groupName: 'system' },
      { key: 'system.version', value: JSON.stringify('2.0.0'), groupName: 'system' },
      { key: 'system.blueprint', value: JSON.stringify(null), groupName: 'system' },
    ];

    for (const s of settingsData) {
      await db.insert(schema.wbSettings).values(s).onConflictDoNothing();
    }

    console.log('✅ Core Kernel seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}
