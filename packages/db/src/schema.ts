import { sqliteTable, integer, text, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * WEBBIOS CORE KERNEL DATABASE SCHEMA
 * Version: 2.0.0
 * Engine: Cloudflare D1 (SQLite)
 * Prefix: wb_ (Core Kernel tables — never uninstalled)
 *
 * Architecture: 4-Layer
 *   Layer 1 — Core Kernel (wb_*)  ← THIS FILE
 *   Layer 2 — Web Foundation (web_*) — separate schema, installed as App
 *   Layer 3 — Solution Suites (com_*, edu_*, ...) — separate schemas
 *   Layer 4 — Blueprint (webbios.dev)
 *
 * Identity Hub: wb_users is the single source of truth for ALL user types
 * (admin, staff, customer, student, member, etc.)
 * Suites create profile extension tables that JOIN back to wb_users.id
 */

// ============================================================
// 1. wb_roles — Role definitions (system + custom)
// ============================================================
export const wbRoles = sqliteTable('wb_roles', {
  id: text('id').primaryKey(), // ULID
  name: text('name').notNull(), // "Chủ sở hữu", "Nhân viên"
  slug: text('slug').notNull().unique(), // "owner", "admin", "staff", "customer"
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    slugIdx: index('idx_wb_roles_slug').on(table.slug),
  };
});

// ============================================================
// 2. wb_permissions — Permission definitions
// ============================================================
export const wbPermissions = sqliteTable('wb_permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // "Xem cài đặt"
  slug: text('slug').notNull().unique(), // "settings:view"
  groupName: text('group_name').notNull(), // "settings", "users", "apps"
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => {
  return {
    slugIdx: index('idx_wb_permissions_slug').on(table.slug),
    groupIdx: index('idx_wb_permissions_group').on(table.groupName),
  };
});

// ============================================================
// 3. wb_role_permissions — Many-to-Many (roles ↔ permissions)
// ============================================================
export const wbRolePermissions = sqliteTable('wb_role_permissions', {
  roleId: text('role_id').notNull().references(() => wbRoles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => wbPermissions.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    roleIdx: index('idx_wb_rp_role').on(table.roleId),
    permIdx: index('idx_wb_rp_perm').on(table.permissionId),
  };
});

// ============================================================
// 4. wb_users — Identity Hub (ALL user types)
// ============================================================
export const wbUsers = sqliteTable('wb_users', {
  id: text('id').primaryKey(), // ULID
  email: text('email').unique(),
  phone: text('phone'),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  dob: text('dob'), // YYYY-MM-DD
  gender: text('gender'), // male | female | other
  roleId: text('role_id').notNull().references(() => wbRoles.id),
  status: text('status').notNull().default('active'), // active | disabled | archived
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    emailIdx: index('idx_wb_users_email').on(table.email),
    phoneIdx: index('idx_wb_users_phone').on(table.phone),
    usernameIdx: index('idx_wb_users_username').on(table.username),
    roleIdx: index('idx_wb_users_role').on(table.roleId),
    statusIdx: index('idx_wb_users_status').on(table.status),
  };
});

// ============================================================
// 4.5 wb_user_permissions — User specific permissions
// ============================================================
export const wbUserPermissions = sqliteTable('wb_user_permissions', {
  userId: text('user_id').notNull().references(() => wbUsers.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => wbPermissions.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.permissionId] }),
    userIdx: index('idx_wb_up_user').on(table.userId),
    permIdx: index('idx_wb_up_perm').on(table.permissionId),
  };
});

// ============================================================
// 5. wb_sessions — Auth sessions for ALL user types
// ============================================================
export const wbSessions = sqliteTable('wb_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => wbUsers.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').unique().notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    userIdx: index('idx_wb_sessions_user').on(table.userId),
    tokenIdx: index('idx_wb_sessions_token').on(table.refreshToken),
    expiresIdx: index('idx_wb_sessions_expires').on(table.expiresAt),
  };
});

// ============================================================
// 6. wb_api_keys — Public API keys for third parties
// ============================================================
export const wbApiKeys = sqliteTable('wb_api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // "Mobile App", "Misa Kế toán"
  secretHash: text('secret_hash').unique().notNull(), // SHA-256 hash
  secretPrefix: text('secret_prefix').notNull(), // "wb_sk_a3f2..." (8 chars for identification)
  scopes: text('scopes', { mode: 'json' }).notNull().default(sql`'[]'`), // ["products:read","orders:write"]
  status: text('status').notNull().default('active'), // active | revoked
  createdBy: text('created_by').notNull().references(() => wbUsers.id),
  expiresAt: text('expires_at'), // NULL = no expiry
  lastUsedAt: text('last_used_at'),
  requestCount: integer('request_count').default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    secretIdx: index('idx_wb_api_keys_secret').on(table.secretHash),
    statusIdx: index('idx_wb_api_keys_status').on(table.status),
  };
});

// ============================================================
// 7. wb_media — File uploads (R2)
// ============================================================
export const wbMedia = sqliteTable('wb_media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  r2Key: text('r2_key').notNull().unique(), // Key on R2 bucket
  url: text('url').notNull(), // CDN URL
  mimeType: text('mime_type'),
  size: integer('size'), // bytes
  width: integer('width'), // pixels (images)
  height: integer('height'), // pixels (images)
  alt: text('alt'), // SEO alt text
  uploadedBy: text('uploaded_by').references(() => wbUsers.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    typeIdx: index('idx_wb_media_type').on(table.mimeType),
    createdIdx: index('idx_wb_media_created').on(table.createdAt),
  };
});

// ============================================================
// 8. wb_menus — Dashboard sidebar menu items
// ============================================================
export const wbMenus = sqliteTable('wb_menus', {
  id: text('id').primaryKey(),
  label: text('label').notNull(), // "Sản phẩm", "Đơn hàng"
  icon: text('icon'), // Icon name: "package", "shopping-cart"
  path: text('path').notNull(), // Route: "/products"
  parentId: text('parent_id'), // Self-ref for sub-menus
  permissionSlug: text('permission_slug'), // "products:read"
  appSlug: text('app_slug'), // Suite/App owner: "commerce", "education"
  position: integer('position').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  isCategory: integer('is_category', { mode: 'boolean' }).notNull().default(false),
  translations: text('translations', { mode: 'json' }).default(sql`'{}'`), // {"en":"Products","vi":"Sản phẩm"}
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    parentIdx: index('idx_wb_menus_parent').on(table.parentId),
    appIdx: index('idx_wb_menus_app').on(table.appSlug),
    positionIdx: index('idx_wb_menus_position').on(table.position),
  };
});

// ============================================================
// 9. wb_settings — Key-value system configuration
// ============================================================
export const wbSettings = sqliteTable('wb_settings', {
  key: text('key').primaryKey(), // "site.name", "system.blueprint"
  value: text('value', { mode: 'json' }).notNull(),
  groupName: text('group_name').notNull(), // site | system | usage
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    groupIdx: index('idx_wb_settings_group').on(table.groupName),
  };
});

// ============================================================
// 10. wb_installed_apps — Installed Suites/Apps registry
// ============================================================
export const wbInstalledApps = sqliteTable('wb_installed_apps', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(), // "commerce", "web-foundation"
  name: text('name').notNull(), // "Commerce Suite"
  version: text('version').notNull(), // "1.0.0"
  type: text('type').notNull().default('suite'), // suite | app | foundation
  author: text('author'),
  description: text('description'),
  iconUrl: text('icon_url'),
  workerName: text('worker_name'), // CF Worker name
  workerUrl: text('worker_url'), // CF Worker URL
  config: text('config', { mode: 'json' }), // App configuration
  permissionsRegistered: text('permissions_registered', { mode: 'json' }), // ["products:read",...]
  hooks: text('hooks', { mode: 'json' }), // ["order.created","order.paid"]
  menuConfig: text('menu_config', { mode: 'json' }), // Menu items registered
  tablesCreated: text('tables_created', { mode: 'json' }), // ["com_products","com_orders"]
  status: text('status').notNull().default('active'), // active | disabled
  installedAt: text('installed_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ============================================================
// 11. wb_audit_logs — Admin action audit trail
// ============================================================
export const wbAuditLogs = sqliteTable('wb_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => wbUsers.id),
  action: text('action').notNull(), // view | create | update | delete | login | logout
  resourceType: text('resource_type').notNull(), // product | order | setting | user
  resourceId: text('resource_id'),
  resourceTitle: text('resource_title'),
  changes: text('changes', { mode: 'json' }), // JSON diff old/new
  route: text('route'), // API route
  method: text('method'), // HTTP method
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    userIdx: index('idx_wb_audit_user').on(table.userId),
    actionIdx: index('idx_wb_audit_action').on(table.action),
    resourceIdx: index('idx_wb_audit_resource').on(table.resourceType, table.resourceId),
    createdIdx: index('idx_wb_audit_created').on(table.createdAt),
  };
});

// ============================================================
// 12. wb_webhooks — System Webhooks
// ============================================================
export const wbWebhooks = sqliteTable('wb_webhooks', {
  id: text('id').primaryKey(), // ULID
  name: text('name').notNull(), // Tên webhook (e.g. Gửi KiotViet)
  url: text('url').notNull(), // Endpoint URL
  events: text('events', { mode: 'json' }).notNull().default(sql`'[]'`), // ["order.created", "user.registered"]
  secret: text('secret'), // Mã xác thực chữ ký (tùy chọn)
  status: text('status').notNull().default('active'), // active | inactive
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    statusIdx: index('idx_wb_webhooks_status').on(table.status),
  };
});

// ============================================================
// 13. wb_cron_jobs — Background Tasks & Schedulers
// ============================================================
export const wbCronJobs = sqliteTable('wb_cron_jobs', {
  id: text('id').primaryKey(), // ULID
  name: text('name').notNull(), // Tên tác vụ (e.g. "Gửi email sinh nhật")
  taskType: text('task_type').notNull(), // 'http_request', 'app_event', 'system_cleanup'
  payload: text('payload', { mode: 'json' }).notNull().default(sql`'{}'`), // JSON config (url, method, app_slug...)
  cronExpression: text('cron_expression'), // "* * * * *" (NULL if run once)
  nextRunAt: text('next_run_at').notNull(), // ISO datetime
  status: text('status').notNull().default('active'), // active | paused | completed | failed
  lastRunAt: text('last_run_at'),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => {
  return {
    statusNextRunIdx: index('idx_wb_cron_jobs_run').on(table.status, table.nextRunAt),
    taskTypeIdx: index('idx_wb_cron_jobs_type').on(table.taskType),
  };
});
