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
    const webbiosMenuId = ulid();
    const settingsMenuId = ulid();

    const menusData = [
      // Top Level
      { id: ulid(), label: 'Tổng quan', icon: 'Home', path: '/', permissionSlug: 'dashboard:view', appSlug: null, position: 1, isSystem: true, translations: { vi: 'Tổng quan', en: 'Dashboard' } },
      { id: ulid(), label: 'Thư viện media', icon: 'Image', path: '/media', permissionSlug: 'media:view', appSlug: null, position: 2, isSystem: true, translations: { vi: 'Thư viện media', en: 'Media Library' } },

      // System Menu Category
      { id: systemMenuId, label: 'Hệ thống', icon: null, path: '', permissionSlug: null, appSlug: null, position: 10, isSystem: true, translations: { vi: 'HỆ THỐNG', en: 'SYSTEM', isCategory: true } },
      { id: ulid(), parentId: systemMenuId, label: 'Người dùng', icon: 'Users', path: '/users', permissionSlug: 'users:view', appSlug: null, position: 11, isSystem: true, translations: { vi: 'Người dùng', en: 'Users' } },
      { id: ulid(), parentId: systemMenuId, label: 'Menu', icon: 'Menu', path: '/system/menus', permissionSlug: 'menus:view', appSlug: null, position: 12, isSystem: true, translations: { vi: 'Menu', en: 'Menus' } },
      { id: ulid(), parentId: systemMenuId, label: 'Vai trò', icon: 'Shield', path: '/system/roles', permissionSlug: 'roles:view', appSlug: null, position: 13, isSystem: true, translations: { vi: 'Vai trò', en: 'Roles' } },
      { id: ulid(), parentId: systemMenuId, label: 'Phân quyền', icon: 'Lock', path: '/system/permissions', permissionSlug: 'permissions:view', appSlug: null, position: 14, isSystem: true, translations: { vi: 'Phân quyền', en: 'Permissions' } },
      { id: ulid(), parentId: systemMenuId, label: 'Nhật ký', icon: 'FileText', path: '/audit', permissionSlug: 'audit:view', appSlug: null, position: 15, isSystem: true, translations: { vi: 'Nhật ký', en: 'Audit Logs' } },
      { id: ulid(), parentId: systemMenuId, label: 'Cron Job', icon: 'Clock', path: '/system/cron-jobs', permissionSlug: 'settings:view', appSlug: null, position: 16, isSystem: true, translations: { vi: 'Cron Job', en: 'Cron Jobs' } },
      { id: settingsMenuId, parentId: systemMenuId, label: 'Cài đặt', icon: 'Settings', path: '', permissionSlug: 'settings:view', appSlug: null, position: 17, isSystem: true, translations: { vi: 'Cài đặt', en: 'Settings' } },
      { id: ulid(), parentId: settingsMenuId, label: 'Hệ thống', icon: null, path: '/settings', permissionSlug: 'settings:view', appSlug: null, position: 1, isSystem: true, translations: { vi: 'Hệ thống', en: 'System' } },
      { id: ulid(), parentId: settingsMenuId, label: 'Tên miền', icon: null, path: '/settings/domains', permissionSlug: 'settings:view', appSlug: null, position: 2, isSystem: true, translations: { vi: 'Tên miền', en: 'Domains' } },
      { id: ulid(), parentId: settingsMenuId, label: 'Webhooks', icon: null, path: '/settings/webhooks', permissionSlug: 'settings:view', appSlug: null, position: 3, isSystem: true, translations: { vi: 'Webhooks', en: 'Webhooks' } },
      { id: ulid(), parentId: systemMenuId, label: 'API Keys', icon: 'Key', path: '/api-keys', permissionSlug: 'api_keys:view', appSlug: null, position: 18, isSystem: true, translations: { vi: 'API Keys', en: 'API Keys' } },

      // WebbiOS Category
      { id: webbiosMenuId, label: 'WebbiOS', icon: null, path: '', permissionSlug: null, appSlug: null, position: 20, isSystem: true, translations: { vi: 'WEBBIOS', en: 'WEBBIOS', isCategory: true } },
      { id: ulid(), parentId: webbiosMenuId, label: 'Bản quyền', icon: 'Circle', path: '/webbios/licenses', permissionSlug: null, appSlug: null, position: 21, isSystem: true, translations: { vi: 'Bản quyền', en: 'License' } },
      { id: ulid(), parentId: webbiosMenuId, label: 'Cập nhật', icon: 'CloudUpload', path: '/webbios/updates', permissionSlug: null, appSlug: null, position: 22, isSystem: true, translations: { vi: 'Cập nhật', en: 'Updates' } },
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
