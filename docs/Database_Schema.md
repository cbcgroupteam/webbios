# WebbiOS — Database Schema Documentation

> **Version:** 2.0.0
> **Ngày tạo:** 2026-06-03
> **Cập nhật lần cuối:** 2026-06-05
> **Tác giả:** WebbiOS Team
> **Engine:** Cloudflare D1 (SQLite)
> **ORM:** Drizzle ORM

---

## Mục lục

- [1. Tổng quan thiết kế](#1-tổng-quan-thiết-kế)
- [2. Quy ước chung](#2-quy-ước-chung)
- [3. Core Kernel Tables (wb\_)](#3-core-kernel-tables-wb_)
- [4. Web Foundation Tables (web\_)](#4-web-foundation-tables-web_)
- [5. Commerce Suite Tables (com\_)](#5-commerce-suite-tables-com_)
- [6. Entity-Relationship Diagram](#6-entity-relationship-diagram)
- [7. Chiến lược Index](#7-chiến-lược-index)
- [8. Quy tắc mở rộng cho Suite/App](#8-quy-tắc-mở-rộng-cho-suiteapp)
- [9. Cloudflare Usage Monitoring](#9-cloudflare-usage-monitoring)
- [10. Seed Data (Dữ liệu khởi tạo)](#10-seed-data-dữ-liệu-khởi-tạo)

---

## 1. Tổng quan thiết kế

### Kiến trúc 4-Layer Database

WebbiOS sử dụng kiến trúc 4 lớp. Mỗi lớp sở hữu bảng dữ liệu riêng biệt với prefix riêng, đảm bảo cài/gỡ Suite không ảnh hưởng lẫn nhau:

| Layer | Prefix | Vai trò | Có thể gỡ? |
|---|---|---|---|
| **Core Kernel** | `wb_` | Identity, Auth, Media, Settings, App Manager | ❌ Không bao giờ |
| **Web Foundation** | `web_` | Content Engine, Theme, Navigation, SEO | ✅ Gỡ được |
| **Commerce Suite** | `com_` | Products, Orders, Customers, Inventory | ✅ Gỡ được |
| **Education Suite** | `edu_` | Courses, Students, Quizzes | ✅ Gỡ được |
| **People Suite** | `ppl_` | Employees, Departments, Payroll | ✅ Gỡ được |
| **Booking Suite** | `bkg_` | Services, Appointments, Clients | ✅ Gỡ được |
| **Event Suite** | `evt_` | Events, Tickets, Attendees | ✅ Gỡ được |
| **Genealogy Suite** | `gen_` | Members, Relationships, Trees | ✅ Gỡ được |

### Triết lý thiết kế

1. **Identity Hub (Định danh Tập trung):** Bảng `wb_users` là trung tâm định danh cho MỌI loại người dùng (admin, staff, khách mua hàng, học viên, thành viên gia phả...). Các Suite tạo bảng profile mở rộng (VD: `com_customers`, `edu_students`) và liên kết về `wb_users.id` bằng Foreign Key.

2. **Cột nghiệp vụ rõ ràng (Explicit Columns):** Các trường dùng thường xuyên trong truy vấn (filter, sort, WHERE) **phải là cột riêng biệt** với index tương ứng, KHÔNG lưu vào JSON metadata.

3. **JSON cho dữ liệu linh hoạt:** Các trường hiếm khi query hoặc có cấu trúc thay đổi thì lưu dưới dạng JSON (TEXT).

4. **Snapshot tại thời điểm giao dịch:** Khi tạo đơn hàng, thông tin sản phẩm (tên, giá, ảnh) phải được copy vào `com_order_items`. Nếu sau đó sản phẩm bị sửa hoặc xóa, đơn hàng vẫn giữ nguyên thông tin gốc.

5. **Prefix = Namespace:** Khi gỡ một Suite, chỉ cần `DROP TABLE` tất cả bảng có prefix tương ứng. Core không bị ảnh hưởng.

### Tham chiếu

Schema này được thiết kế dựa trên kinh nghiệm thực chiến từ **CBC Ecosystem** (coolmom.vn) — hệ thống đang phục vụ hàng nghìn sản phẩm và đơn hàng mỗi ngày trên Cloudflare D1.

---

## 2. Quy ước chung

| Quy ước | Mô tả |
|---|---|
| **Primary Key** | `TEXT` chứa ULID (26 ký tự, sortable, unique). Ví dụ: `01HXXXXXXXXXXXXXXXXXXXXXX` |
| **Tên cột** | `snake_case`. Ví dụ: `created_at`, `is_active`, `compare_at_price` |
| **Tên bảng** | `snake_case`, có prefix theo layer. Ví dụ: `wb_users`, `com_products` |
| **Table Prefix** | `wb_` = Core, `web_` = Web Foundation, `com_` = Commerce, `edu_` = Education, v.v. |
| **Boolean** | `INTEGER` (0/1) vì SQLite không có kiểu BOOLEAN native |
| **Tiền tệ** | `REAL` (float). Đơn vị: VND (không chia cho 100) |
| **Ngày giờ** | `TEXT` với format ISO 8601: `datetime('now')`. Ví dụ: `2026-06-03T10:30:00Z` |
| **JSON** | `TEXT` chứa chuỗi JSON. Parse bằng `JSON_EXTRACT()` trong SQLite |
| **Foreign Key** | Cùng kiểu với Primary Key của bảng cha (`TEXT`) |
| **Soft Delete** | Sử dụng cột `status` thay vì xóa thật. Giá trị `archived` = đã xóa mềm |

---

## 3. Core Kernel Tables (wb_)

> **10 bảng** — Luôn tồn tại trên mọi bản WebbiOS, bất kể Blueprint nào.

### 3.1 wb_users

> Trung tâm định danh (Identity Hub). Lưu TẤT CẢ người dùng: admin, staff, khách hàng, học viên, thành viên gia phả, v.v.

```sql
CREATE TABLE wb_users (
  id TEXT PRIMARY KEY,                    -- ULID
  email TEXT UNIQUE,                      -- Email (có thể NULL nếu đăng ký bằng SĐT)
  phone TEXT,                             -- Số điện thoại
  username TEXT UNIQUE,                   -- Username (tùy chọn)
  password_hash TEXT NOT NULL,            -- PBKDF2 hash: base64(salt):base64(hash)
  first_name TEXT,                        -- Họ
  last_name TEXT,                         -- Tên
  avatar_url TEXT,                        -- URL ảnh đại diện (R2)
  dob TEXT,                               -- Ngày sinh (YYYY-MM-DD)
  gender TEXT,                            -- male | female | other
  role_id TEXT NOT NULL REFERENCES wb_roles(id), -- FK → wb_roles
  status TEXT NOT NULL DEFAULT 'active',  -- active | disabled | archived
  last_login_at TEXT,                     -- Thời điểm đăng nhập gần nhất
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_users_email ON wb_users(email);
CREATE INDEX idx_wb_users_phone ON wb_users(phone);
CREATE INDEX idx_wb_users_username ON wb_users(username);
CREATE INDEX idx_wb_users_role ON wb_users(role_id);
CREATE INDEX idx_wb_users_status ON wb_users(status);
```

**Identity Hub — Cách hoạt động:**
- Khi khách mua hàng đăng ký trên Storefront → tạo record trong `wb_users` (role = `customer`) + record trong `com_customers` (profile mở rộng thương mại).
- Khi thành viên gia phả đăng ký trên nguoncoi.net → tạo record trong `wb_users` (role = `member`) + record trong `gen_members` (profile mở rộng gia phả).
- Cùng 1 email có thể dùng chung trên nhiều hệ thống khác nhau nếu cùng 1 bản WebbiOS.

**Trường hợp sử dụng:**
- Đăng nhập: `SELECT u.*, r.slug as role_slug FROM wb_users u JOIN wb_roles r ON u.role_id = r.id WHERE u.email = ? AND u.status = 'active'`
- Khóa tài khoản: `UPDATE wb_users SET status = 'disabled' WHERE id = ?`

---

### 3.2 wb_roles

> Vai trò (Role) trong hệ thống. Hỗ trợ cả role hệ thống cố định và role custom.

```sql
CREATE TABLE wb_roles (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- Tên hiển thị: "Quản lý kho", "Nhân viên bán hàng"
  slug TEXT NOT NULL UNIQUE,              -- Machine-readable: "warehouse_manager"
  description TEXT,                       -- Mô tả vai trò
  is_system INTEGER NOT NULL DEFAULT 0,   -- 1 = role hệ thống, không thể xóa/sửa
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_roles_slug ON wb_roles(slug);
```

**Roles hệ thống (Seed Data — `is_system = 1`):**

| slug | name | Mô tả |
|---|---|---|
| `owner` | Chủ sở hữu | Toàn quyền. Không thể xóa hoặc thu hồi quyền. |
| `admin` | Quản trị viên | Gần toàn quyền. Không thể quản lý Owner. |
| `staff` | Nhân viên | Quyền hạn chế theo phân công. |
| `viewer` | Người xem | Chỉ đọc: xem báo cáo, xem dữ liệu. |
| `customer` | Khách hàng | Đăng nhập Storefront, đặt hàng, xem tài khoản. |

> ⚠️ Các Suite có thể đăng ký thêm role khi cài đặt (VD: Education Suite thêm role `student`, `teacher`).

---

### 3.3 wb_permissions

> Quyền (Permission) — đại diện cho 1 hành động cụ thể trong hệ thống.

```sql
CREATE TABLE wb_permissions (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- Tên hiển thị: "Xem cài đặt"
  slug TEXT NOT NULL UNIQUE,              -- Machine-readable: "settings:view"
  group_name TEXT NOT NULL,               -- Nhóm: "settings", "users", "apps"
  description TEXT,                       -- Mô tả chi tiết
  sort_order INTEGER NOT NULL DEFAULT 0   -- Thứ tự hiển thị trong nhóm
);

CREATE INDEX idx_wb_permissions_slug ON wb_permissions(slug);
CREATE INDEX idx_wb_permissions_group ON wb_permissions(group_name);
```

**Permissions Core (Seed Data):**

| slug | name | group_name |
|---|---|---|
| `dashboard:view` | Xem tổng quan | dashboard |
| `settings:view` | Xem cài đặt | settings |
| `settings:edit` | Sửa cài đặt | settings |
| `users:view` | Xem thành viên | users |
| `users:manage` | Quản lý thành viên | users |
| `apps:manage` | Quản lý ứng dụng | apps |
| `media:upload` | Upload file | media |
| `media:delete` | Xóa file | media |

> ⚠️ Mỗi Suite khi cài đặt sẽ đăng ký thêm permissions riêng (VD: Commerce Suite thêm `products:read`, `orders:process`). Khi gỡ Suite, các permissions đó cũng bị xóa.

### 3.4 wb_role_permissions

> Bảng trung gian (Many-to-Many) gắn quyền vào vai trò.

```sql
CREATE TABLE wb_role_permissions (
  role_id TEXT NOT NULL REFERENCES wb_roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES wb_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_wb_rp_role ON wb_role_permissions(role_id);
CREATE INDEX idx_wb_rp_perm ON wb_role_permissions(permission_id);
```

**Trường hợp sử dụng:**
- Lấy tất cả quyền của 1 user: `SELECT p.slug FROM wb_permissions p JOIN wb_role_permissions rp ON p.id = rp.permission_id JOIN wb_users u ON u.role_id = rp.role_id WHERE u.id = ?`
- Gán quyền cho role: `INSERT INTO wb_role_permissions (role_id, permission_id) VALUES (?, ?)`

---

### 3.5 wb_user_permissions

> Bảng trung gian (Many-to-Many) gắn quyền trực tiếp vào một user (quyền bổ sung ngoài Role).

```sql
CREATE TABLE wb_user_permissions (
  user_id TEXT NOT NULL REFERENCES wb_users(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES wb_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX idx_wb_up_user ON wb_user_permissions(user_id);
CREATE INDEX idx_wb_up_perm ON wb_user_permissions(permission_id);
```

**Trường hợp sử dụng:**
- Lấy tất cả quyền của 1 user (gồm quyền từ Role và quyền cấp riêng):
  ```sql
  SELECT DISTINCT p.slug 
  FROM wb_permissions p 
  LEFT JOIN wb_role_permissions rp ON p.id = rp.permission_id
  LEFT JOIN wb_user_permissions up ON p.id = up.permission_id
  JOIN wb_users u ON u.role_id = rp.role_id OR u.id = up.user_id
  WHERE u.id = ?
  ```

---

### 3.5 wb_sessions

> Quản lý phiên đăng nhập (refresh token) cho TẤT CẢ loại user. Hỗ trợ đa thiết bị.

```sql
CREATE TABLE wb_sessions (
  id TEXT PRIMARY KEY,                    -- ULID
  user_id TEXT NOT NULL REFERENCES wb_users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,     -- Token dùng để làm mới access token
  user_agent TEXT,                        -- Thông tin trình duyệt
  ip_address TEXT,                        -- IP đăng nhập
  expires_at TEXT NOT NULL,               -- Thời điểm hết hạn
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_sessions_user ON wb_sessions(user_id);
CREATE INDEX idx_wb_sessions_token ON wb_sessions(refresh_token);
CREATE INDEX idx_wb_sessions_expires ON wb_sessions(expires_at);
```

**Trường hợp sử dụng:**
- Làm mới token: `SELECT * FROM wb_sessions WHERE refresh_token = ? AND expires_at > datetime('now')`
- Đăng xuất tất cả thiết bị: `DELETE FROM wb_sessions WHERE user_id = ?`
- Dọn dẹp session hết hạn (Cron): `DELETE FROM wb_sessions WHERE expires_at < datetime('now')`

---

### 3.6 wb_api_keys

> API Keys cho bên thứ 3 (Mobile app, phần mềm kế toán, dev freelance). Mỗi key có scopes riêng.

```sql
CREATE TABLE wb_api_keys (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Mobile App", "Misa Kế toán"
  secret_hash TEXT UNIQUE NOT NULL,       -- SHA-256 hash (không lưu plaintext)
  secret_prefix TEXT NOT NULL,            -- 8 ký tự đầu để nhận diện: "wb_sk_a3f2..."
  scopes TEXT NOT NULL DEFAULT '[]',      -- JSON: ["products:read","orders:write"]
  status TEXT NOT NULL DEFAULT 'active',  -- active | revoked
  created_by TEXT NOT NULL REFERENCES wb_users(id),
  expires_at TEXT,                        -- NULL = không hết hạn
  last_used_at TEXT,
  request_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_api_keys_secret ON wb_api_keys(secret_hash);
CREATE INDEX idx_wb_api_keys_status ON wb_api_keys(status);
```

**Luồng hoạt động:**
1. Admin vào Dashboard → Settings → API Keys → "Tạo key mới"
2. Nhập tên, chọn scopes, chọn thời hạn
3. Hệ thống sinh secret: `wb_sk_a3f2x9k1m7p4q8w2...`
4. Hiển thị secret **1 LẦN DUY NHẤT** (sau đó chỉ lưu hash)
5. Bên thứ 3 gọi API: `Authorization: Bearer wb_sk_a3f2x9k1...`
6. Core API hash secret → tìm trong `wb_api_keys` → kiểm tra scopes → cho phép/từ chối

---

### 3.7 wb_media

> Quản lý file đã upload lên R2. Dùng chung cho toàn hệ thống.

```sql
CREATE TABLE wb_media (
  id TEXT PRIMARY KEY,                    -- ULID
  filename TEXT NOT NULL,                 -- Tên file gốc
  r2_key TEXT NOT NULL UNIQUE,            -- Key trên R2 bucket
  url TEXT NOT NULL,                      -- CDN URL public
  mime_type TEXT,                         -- image/jpeg, application/pdf
  size INTEGER,                           -- Bytes
  width INTEGER,                         -- Pixel (cho ảnh)
  height INTEGER,                        -- Pixel (cho ảnh)
  alt TEXT,                               -- Alt text cho SEO
  uploaded_by TEXT REFERENCES wb_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_media_type ON wb_media(mime_type);
CREATE INDEX idx_wb_media_created ON wb_media(created_at);
```

---

### 3.8 wb_menus

> Menu items trên Dashboard sidebar. Các Suite đăng ký menu khi cài đặt.

```sql
CREATE TABLE wb_menus (
  id TEXT PRIMARY KEY,                    -- ULID
  label TEXT NOT NULL,                    -- "Sản phẩm", "Đơn hàng"
  icon TEXT,                              -- Icon name: "package", "shopping-cart"
  path TEXT NOT NULL,                     -- Route: "/products", "/orders"
  parent_id TEXT REFERENCES wb_menus(id), -- Menu cha (NULL = gốc)
  permission_slug TEXT,                   -- Quyền cần có: "products:read"
  app_slug TEXT,                          -- Suite/App nào đăng ký: "commerce", "education"
  position INTEGER NOT NULL DEFAULT 0,    -- Thứ tự hiển thị
  is_visible INTEGER NOT NULL DEFAULT 1,  -- 1 = hiển thị
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_menus_parent ON wb_menus(parent_id);
CREATE INDEX idx_wb_menus_app ON wb_menus(app_slug);
CREATE INDEX idx_wb_menus_position ON wb_menus(position);
```

**Cơ chế hoạt động:**
- Core tạo sẵn menu cơ bản: "Tổng quan", "Cài đặt", "Ứng dụng".
- Khi cài Commerce Suite → INSERT menu "Sản phẩm", "Đơn hàng", "Khách hàng" (với `app_slug = 'commerce'`).
- Khi gỡ Commerce Suite → `DELETE FROM wb_menus WHERE app_slug = 'commerce'`.
- Dashboard render sidebar dựa trên `wb_menus` + kiểm tra `permission_slug` của user.

---

### 3.9 wb_settings

> Cài đặt hệ thống dạng key-value. Lưu trữ mọi cấu hình.

```sql
CREATE TABLE wb_settings (
  key TEXT PRIMARY KEY,                   -- VD: 'site.name', 'site.logo_url'
  value TEXT NOT NULL,                    -- JSON value
  group_name TEXT NOT NULL,               -- site | system | usage
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_settings_group ON wb_settings(group_name);
```

**Một số key phổ biến:**

| Key | Group | Value (example) |
|---|---|---|
| `site.name` | site | `"Coolmom Baby Store"` |
| `site.logo_url` | site | `"https://r2.../logo.png"` |
| `site.language` | site | `"vi"` |
| `site.currency` | site | `"VND"` |
| `system.webbios_version` | system | `"1.0.0"` |
| `system.blueprint` | system | `"ecommerce"` |
| `system.license_key` | system | `"wb_lic_xxx..."` |

---

### 3.10 wb_installed_apps

> Danh sách App/Suite đã cài đặt. Mỗi App = 1 Cloudflare Worker riêng biệt.

```sql
CREATE TABLE wb_installed_apps (
  id TEXT PRIMARY KEY,                    -- ULID
  slug TEXT NOT NULL UNIQUE,              -- "commerce", "web-foundation", "education"
  name TEXT NOT NULL,                     -- "Commerce Suite", "Web Foundation"
  version TEXT NOT NULL,                  -- "1.0.0"
  type TEXT NOT NULL DEFAULT 'suite',     -- suite | app | foundation
  author TEXT,                            -- "WebbiOS Team"
  description TEXT,
  icon_url TEXT,                          -- Icon
  worker_name TEXT,                       -- Tên Worker trên CF: "webbios-suite-commerce"
  worker_url TEXT,                        -- URL Worker
  config TEXT,                            -- JSON: cấu hình app
  permissions_registered TEXT,            -- JSON: permissions đã đăng ký ["products:read",...]
  hooks TEXT,                             -- JSON: event hooks ["order.created","order.paid"]
  menu_config TEXT,                       -- JSON: menu items đã đăng ký
  tables_created TEXT,                    -- JSON: danh sách bảng đã tạo ["com_products","com_orders"]
  status TEXT NOT NULL DEFAULT 'active',  -- active | disabled
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Luồng cài đặt Suite (VD: Commerce Suite):**
1. Khách nhấn "Cài đặt" trên Dashboard (hoặc tự động theo Blueprint)
2. Core API gọi Cloudflare API để deploy Commerce Worker
3. Commerce Worker chạy migration: tạo các bảng `com_*` trong D1
4. Commerce Worker đăng ký permissions (`products:read`, `orders:process`...) vào `wb_permissions`
5. Commerce Worker đăng ký menu items vào `wb_menus`
6. Ghi record vào `wb_installed_apps` (kèm `tables_created` để biết cần xóa gì khi gỡ)

**Luồng gỡ Suite:**
1. `DROP TABLE` tất cả bảng có prefix `com_*` (lấy từ `tables_created`)
2. `DELETE FROM wb_permissions WHERE slug LIKE 'products:%' OR slug LIKE 'orders:%'...`
3. `DELETE FROM wb_menus WHERE app_slug = 'commerce'`
4. `DELETE FROM wb_installed_apps WHERE slug = 'commerce'`
5. DELETE Worker trên Cloudflare
6. **Hệ thống sạch sẽ 100%**

---

### 3.11 wb_audit_logs

> Nhật ký hành động trên Dashboard. Ghi lại AI làm GÌ, với DỮ LIỆU NÀO, KHI NÀO.

```sql
CREATE TABLE wb_audit_logs (
  id TEXT PRIMARY KEY,                    -- ULID
  user_id TEXT REFERENCES wb_users(id),   -- Ai thực hiện (NULL = hệ thống)
  action TEXT NOT NULL,                   -- view | create | update | delete | export | login | logout
  resource_type TEXT NOT NULL,            -- product | order | setting | user | app
  resource_id TEXT,                       -- ID tài nguyên
  resource_title TEXT,                    -- Tên hiển thị (giữ lại dù tài nguyên bị xóa)
  changes TEXT,                           -- JSON: diff cũ/mới (khi action=update)
  route TEXT,                             -- API route: "/v1/admin/products/01HX..."
  method TEXT,                            -- HTTP method: GET | POST | PUT | DELETE
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wb_audit_user ON wb_audit_logs(user_id);
CREATE INDEX idx_wb_audit_action ON wb_audit_logs(action);
CREATE INDEX idx_wb_audit_resource ON wb_audit_logs(resource_type, resource_id);
CREATE INDEX idx_wb_audit_created ON wb_audit_logs(created_at);
```

**Quản lý dung lượng:**
- Retention: 90 ngày. Cron: `DELETE FROM wb_audit_logs WHERE created_at < datetime('now', '-90 days')`

---

## 4. Web Foundation Tables (web_)

> **5 bảng** — Chỉ tồn tại khi cài **Web Foundation App** (Blueprint có website public). Khi gỡ → DROP tất cả bảng `web_*`.

### 4.1 web_articles

> Nội dung thống nhất: Pages (trang tĩnh) + Blog (bài viết). Dùng cột `type` để phân loại.

```sql
CREATE TABLE web_articles (
  id TEXT PRIMARY KEY,                    -- ULID
  title TEXT NOT NULL,                    -- "Giới thiệu công ty"
  slug TEXT NOT NULL UNIQUE,              -- "gioi-thieu-cong-ty"
  excerpt TEXT,                           -- Tóm tắt (hiện ở listing)
  content TEXT,                           -- Nội dung HTML đầy đủ
  type TEXT NOT NULL DEFAULT 'blog',      -- blog | page | news | guide
  category_id TEXT REFERENCES web_categories(id),
  author_id TEXT REFERENCES wb_users(id), -- JOIN Core users
  featured_image TEXT,                    -- Ảnh đại diện
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | published | archived
  is_featured INTEGER NOT NULL DEFAULT 0,
  allow_comments INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT,                              -- JSON: ["seo","review"]
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_web_articles_slug ON web_articles(slug);
CREATE INDEX idx_web_articles_type ON web_articles(type);
CREATE INDEX idx_web_articles_status ON web_articles(status, type);
CREATE INDEX idx_web_articles_category ON web_articles(category_id);
CREATE INDEX idx_web_articles_published ON web_articles(published_at);
```

---

### 4.2 web_categories

> Danh mục bài viết. Hỗ trợ cây phân cấp.

```sql
CREATE TABLE web_categories (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Kiến thức"
  slug TEXT NOT NULL UNIQUE,              -- "kien-thuc"
  description TEXT,
  parent_id TEXT REFERENCES web_categories(id),
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_web_categories_slug ON web_categories(slug);
CREATE INDEX idx_web_categories_parent ON web_categories(parent_id);
CREATE INDEX idx_web_categories_active ON web_categories(is_active, position);
```

---

### 4.3 web_nav_menus

> Thanh menu điều hướng website public (Header, Footer, Sidebar).

```sql
CREATE TABLE web_nav_menus (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Header Menu", "Footer Menu"
  slug TEXT NOT NULL UNIQUE,              -- "header", "footer"
  location TEXT NOT NULL,                 -- header | footer | sidebar
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.4 web_nav_items

> Các mục trong thanh menu. Hỗ trợ cây phân cấp (menu con).

```sql
CREATE TABLE web_nav_items (
  id TEXT PRIMARY KEY,                    -- ULID
  menu_id TEXT NOT NULL REFERENCES web_nav_menus(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                    -- "Trang chủ", "Sản phẩm"
  url TEXT NOT NULL,                      -- "/", "/products", "https://..."
  target TEXT DEFAULT '_self',            -- _self | _blank
  parent_id TEXT REFERENCES web_nav_items(id),
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_web_nav_items_menu ON web_nav_items(menu_id);
CREATE INDEX idx_web_nav_items_parent ON web_nav_items(parent_id);
```

---

### 4.5 web_installed_themes

> Theme đã cài đặt. Chỉ 1 theme active tại 1 thời điểm.

```sql
CREATE TABLE web_installed_themes (
  id TEXT PRIMARY KEY,                    -- ULID
  slug TEXT NOT NULL UNIQUE,              -- "webbios-starter"
  name TEXT NOT NULL,                     -- "WebbiOS Starter Theme"
  version TEXT NOT NULL,                  -- "1.0.0"
  author TEXT,
  description TEXT,
  thumbnail_url TEXT,                     -- Ảnh preview
  config TEXT,                            -- JSON: cấu hình theme (màu sắc, font, layout)
  is_active INTEGER NOT NULL DEFAULT 0,   -- 1 = đang sử dụng (chỉ 1 active)
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 5. Commerce Suite Tables (com_)

> **16 bảng** — Chỉ tồn tại khi cài **Commerce Suite**. Đây là bộ nghiệp vụ thương mại điện tử hoàn chỉnh. Khi gỡ → DROP tất cả bảng `com_*`.

### 5.1 com_product_types

> Loại sản phẩm (phân loại theo bản chất). Hỗ trợ cây phân cấp.

```sql
CREATE TABLE com_product_types (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Máy hút sữa"
  slug TEXT NOT NULL UNIQUE,              -- "may-hut-sua"
  description TEXT,
  parent_id TEXT REFERENCES com_product_types(id),
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_ptypes_parent ON com_product_types(parent_id);
CREATE INDEX idx_com_ptypes_slug ON com_product_types(slug);
CREATE INDEX idx_com_ptypes_active ON com_product_types(is_active, position);
```

---

### 5.2 com_collections

> Bộ sưu tập sản phẩm — nhóm SP theo mục đích (chiến dịch, mùa, theme).

```sql
CREATE TABLE com_collections (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Flash Sale Tháng 6"
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'manual',    -- manual | automated
  rules TEXT,                             -- JSON: điều kiện tự động
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_collections_slug ON com_collections(slug);
CREATE INDEX idx_com_collections_active ON com_collections(is_active, position);
```

### 5.3 com_collection_items

> Bảng trung gian: Sản phẩm ↔ Collection (Many-to-Many).

```sql
CREATE TABLE com_collection_items (
  product_id TEXT NOT NULL REFERENCES com_products(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES com_collections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX idx_com_ci_collection ON com_collection_items(collection_id);
```

---

### 5.4 com_vendors

> Nhà cung cấp / Thương hiệu.

```sql
CREATE TABLE com_vendors (
  id TEXT PRIMARY KEY,                    -- ULID
  name TEXT NOT NULL,                     -- "Medela"
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  origin TEXT,                            -- "Thụy Sĩ"
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_vendors_slug ON com_vendors(slug);
CREATE INDEX idx_com_vendors_active ON com_vendors(is_active, display_order);
```

---

### 5.5 com_products

> Bảng trung tâm của Commerce Suite.

```sql
CREATE TABLE com_products (
  id TEXT PRIMARY KEY,                        -- ULID
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,                           -- HTML
  price REAL NOT NULL DEFAULT 0,              -- VND
  compare_at_price REAL,
  cost_price REAL,                            -- Giá vốn
  product_type_id TEXT REFERENCES com_product_types(id),
  vendor_id TEXT REFERENCES com_vendors(id),
  created_by TEXT REFERENCES wb_users(id),    -- JOIN Core users
  status TEXT NOT NULL DEFAULT 'draft',       -- draft | active | archived
  has_variants INTEGER NOT NULL DEFAULT 0,
  in_stock INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_bestseller INTEGER NOT NULL DEFAULT 0,
  is_flashsale INTEGER NOT NULL DEFAULT 0,
  is_recommend INTEGER NOT NULL DEFAULT 0,
  track_inventory INTEGER NOT NULL DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight REAL,                                -- gram
  sku TEXT,
  barcode TEXT,
  options TEXT,                               -- JSON: [{"name":"Màu","values":["Đỏ","Xanh"]}]
  media TEXT,                                 -- JSON: [{"url":"...","alt":"..."}]
  tags TEXT,                                  -- JSON: ["hot","mới"]
  reviews_summary TEXT,                       -- JSON: {"total":150,"avg":4.8}
  metadata TEXT,                              -- JSON: dữ liệu mở rộng
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_products_slug ON com_products(slug);
CREATE INDEX idx_com_products_status ON com_products(status);
CREATE INDEX idx_com_products_type ON com_products(product_type_id);
CREATE INDEX idx_com_products_vendor ON com_products(vendor_id);
CREATE INDEX idx_com_products_stock ON com_products(in_stock);
CREATE INDEX idx_com_products_created ON com_products(created_at);
CREATE INDEX idx_com_products_sorting ON com_products(status, in_stock, is_recommend, is_bestseller, is_flashsale, created_at);
```

---

### 5.6 com_product_variants

> Biến thể sản phẩm (Màu sắc, Kích thước...).

```sql
CREATE TABLE com_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES com_products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                        -- "Đỏ / XL"
  sku TEXT,
  barcode TEXT,
  price REAL NOT NULL,
  compare_at_price REAL,
  cost_price REAL,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  in_stock INTEGER NOT NULL DEFAULT 0,
  option1_name TEXT,
  option1_value TEXT,
  option2_name TEXT,
  option2_value TEXT,
  option3_name TEXT,
  option3_value TEXT,
  image_url TEXT,
  media TEXT,                                 -- JSON
  gifts TEXT,                                 -- JSON: quà tặng kèm
  weight REAL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_variants_product ON com_product_variants(product_id);
CREATE INDEX idx_com_variants_sku ON com_product_variants(sku);
CREATE INDEX idx_com_variants_stock ON com_product_variants(product_id, in_stock);
```

---

### 5.7 com_product_images

```sql
CREATE TABLE com_product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES com_products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_images_product ON com_product_images(product_id);
```

---

### 5.8 com_customers

> Profile mở rộng thương mại. JOIN với `wb_users` (Identity Hub).

```sql
CREATE TABLE com_customers (
  id TEXT PRIMARY KEY,                        -- ULID
  user_id TEXT UNIQUE REFERENCES wb_users(id), -- JOIN Core Identity Hub
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent REAL NOT NULL DEFAULT 0,        -- VND
  last_order_at TEXT,
  accepts_marketing INTEGER NOT NULL DEFAULT 0,
  tags TEXT,                                  -- JSON: ["VIP","Wholesale"]
  note TEXT,                                  -- Ghi chú nội bộ
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_customers_user ON com_customers(user_id);
CREATE INDEX idx_com_customers_spent ON com_customers(total_spent);
```

**Cách hoạt động Identity Hub:**
- Khách mua hàng đăng ký → tạo `wb_users` (role=customer, email, password, name) + `com_customers` (user_id → wb_users.id)
- Truy vấn thông tin khách: `SELECT u.first_name, u.last_name, u.email, c.total_orders, c.total_spent FROM wb_users u JOIN com_customers c ON c.user_id = u.id WHERE c.id = ?`

---

### 5.9 com_customer_addresses

> Địa chỉ giao hàng. Mỗi khách có thể lưu nhiều địa chỉ.

```sql
CREATE TABLE com_customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES com_customers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  ward TEXT,
  district TEXT,
  city TEXT NOT NULL,
  province_code TEXT,
  district_code TEXT,
  ward_code TEXT,
  country TEXT NOT NULL DEFAULT 'VN',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_addr_customer ON com_customer_addresses(customer_id);
```

---

### 5.10 com_orders

> Đơn hàng — sử dụng **3 trục trạng thái** độc lập.

```sql
CREATE TABLE com_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,          -- "#1001"
  customer_id TEXT REFERENCES com_customers(id),

  -- 3 TRỤC TRẠNG THÁI
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | confirmed | processing | completed | cancelled
  financial_status TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | partially_paid | refunded | partial_refund
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
    -- unfulfilled | in_progress | fulfilled | returned

  -- TIỀN TỆ
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  shipping_fee REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',

  -- THANH TOÁN
  payment_method TEXT,                        -- zalopay | momo | cod | bank_transfer
  gateway TEXT,

  -- GIAO HÀNG (Snapshot)
  shipping_method TEXT,                       -- ghn | ghtk | spx
  shipping_address TEXT,                      -- JSON snapshot

  -- GIẢM GIÁ
  discount_code TEXT,
  discount_id TEXT REFERENCES com_discounts(id),

  -- GHI CHÚ
  customer_note TEXT,
  staff_note TEXT,
  cancel_reason TEXT,

  -- METADATA
  source TEXT DEFAULT 'web',                  -- web | mobile | manual | api
  ip_address TEXT,
  user_agent TEXT,
  attribution TEXT,                           -- JSON: UTM, referrer

  -- TIMESTAMPS
  confirmed_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_orders_number ON com_orders(order_number);
CREATE INDEX idx_com_orders_customer ON com_orders(customer_id);
CREATE INDEX idx_com_orders_status ON com_orders(status);
CREATE INDEX idx_com_orders_financial ON com_orders(financial_status);
CREATE INDEX idx_com_orders_fulfillment ON com_orders(fulfillment_status);
CREATE INDEX idx_com_orders_created ON com_orders(created_at);
```

---

### 5.11 com_order_items

> Chi tiết sản phẩm trong đơn hàng. Dữ liệu **snapshot** tại thời điểm đặt.

```sql
CREATE TABLE com_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES com_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES com_products(id),
  variant_id TEXT REFERENCES com_product_variants(id),
  title TEXT NOT NULL,                        -- Snapshot tên SP
  variant_title TEXT,
  sku TEXT,
  image_url TEXT,
  price REAL NOT NULL,                        -- Snapshot giá
  compare_at_price REAL,
  cost_price REAL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total REAL NOT NULL,                        -- price × quantity
  total_discount REAL NOT NULL DEFAULT 0,
  weight REAL,
  vendor_id TEXT REFERENCES com_vendors(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_oi_order ON com_order_items(order_id);
CREATE INDEX idx_com_oi_product ON com_order_items(product_id);
```

---

### 5.12 com_order_fulfillments

> Quản lý vận đơn giao hàng.

```sql
CREATE TABLE com_order_fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES com_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | shipped | delivered | cancelled
  tracking_number TEXT,
  tracking_company TEXT,                      -- "GHN", "GHTK"
  tracking_url TEXT,
  cod_amount REAL DEFAULT 0,
  shipped_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_fulfill_order ON com_order_fulfillments(order_id);
CREATE INDEX idx_com_fulfill_tracking ON com_order_fulfillments(tracking_number);
```

---

### 5.13 com_order_transactions

> Lịch sử giao dịch thanh toán.

```sql
CREATE TABLE com_order_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES com_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                         -- authorization | capture | sale | refund | void
  gateway TEXT NOT NULL,                      -- zalopay | momo | cod
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | success | failure
  transaction_id TEXT,                        -- ID từ cổng thanh toán
  error_code TEXT,
  raw_data TEXT,                              -- JSON: dữ liệu thô
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_txn_order ON com_order_transactions(order_id);
CREATE INDEX idx_com_txn_gateway ON com_order_transactions(gateway);
CREATE INDEX idx_com_txn_tid ON com_order_transactions(transaction_id);
```

---

### 5.14 com_order_histories

> Nhật ký hoạt động đơn hàng. Timeline trên Dashboard.

```sql
CREATE TABLE com_order_histories (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES com_orders(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES wb_users(id),      -- JOIN Core users
  action TEXT NOT NULL,                       -- status_change | payment_received | note_added
  note TEXT,
  metadata TEXT,                              -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_oh_order ON com_order_histories(order_id);
```

---

### 5.15 com_discounts

> Mã giảm giá / Coupon.

```sql
CREATE TABLE com_discounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,                  -- "SUMMER2026"
  title TEXT,
  description TEXT,
  type TEXT NOT NULL,                         -- percentage | fixed_amount | free_shipping
  value REAL NOT NULL,
  min_order_amount REAL,
  max_discount_amount REAL,
  max_uses INTEGER,
  max_uses_per_customer INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  applies_to TEXT DEFAULT 'all',              -- all | specific_products | specific_types
  product_ids TEXT,                           -- JSON
  type_ids TEXT,                              -- JSON
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_com_discounts_code ON com_discounts(code);
CREATE INDEX idx_com_discounts_active ON com_discounts(is_active, start_date, end_date);
```

---

## 6. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  CORE KERNEL (wb_)                                              │
│                                                                 │
│  ┌────────────┐     ┌────────────┐     ┌────────────────┐      │
│  │ wb_users   │────▶│ wb_roles   │────▶│wb_role_perms   │      │
│  │ (Identity  │     │            │     │                │      │
│  │  Hub)      │     └────────────┘     └───────┬────────┘      │
│  └─────┬──────┘                                │               │
│        │           ┌────────────┐     ┌────────▼────────┐      │
│        ├──────────▶│wb_sessions │     │wb_permissions   │      │
│        │           └────────────┘     └─────────────────┘      │
│        │           ┌────────────┐     ┌─────────────────┐      │
│        ├──────────▶│wb_api_keys │     │wb_installed_apps│      │
│        │           └────────────┘     └─────────────────┘      │
│        │           ┌────────────┐     ┌─────────────────┐      │
│        ├──────────▶│wb_audit_log│     │  wb_settings    │      │
│        │           └────────────┘     └─────────────────┘      │
│        │           ┌────────────┐                               │
│        └──────────▶│  wb_media  │     ┌─────────────────┐      │
│                    └────────────┘     │   wb_menus      │      │
│                                       └─────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
        │ wb_users.id (FK)
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMMERCE SUITE (com_)                                          │
│                                                                 │
│  ┌──────────────┐     ┌────────────────┐                       │
│  │com_customers │     │ com_products   │                       │
│  │──────────────│     │────────────────│                       │
│  │ user_id ─────│──▶  │ created_by ────│──▶ wb_users           │
│  │              │  │  │ type_id ───────│──▶ com_product_types  │
│  │              │  │  │ vendor_id ─────│──▶ com_vendors        │
│  └──────┬───────┘  │  └──────┬─────────┘                       │
│         │          │         │                                  │
│  ┌──────▼───────┐  │  ┌──────▼─────────┐  ┌────────────────┐  │
│  │com_addresses │  │  │ com_variants   │  │com_collections │  │
│  └──────────────┘  │  └────────────────┘  └────────────────┘  │
│                    │                                            │
│  ┌─────────────────▼──────────┐                                │
│  │       com_orders           │                                │
│  │────────────────────────────│                                │
│  │ customer_id → com_customers│                                │
│  │ 3 trục trạng thái         │                                │
│  └──────┬──────┬──────┬───────┘                                │
│         │      │      │                                        │
│    ┌────▼──┐┌──▼───┐┌─▼──────────┐  ┌─────────────┐          │
│    │ items ││ txns ││fulfillments│  │  discounts  │          │
│    └───────┘└──────┘└────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Chiến lược Index

### Nguyên tắc đánh Index

1. **Mọi Foreign Key phải có index** — D1/SQLite không tự tạo index cho FK.
2. **Cột dùng trong WHERE thường xuyên** — `status`, `email`, `slug`, `in_stock`.
3. **Composite index cho query phức tạp** — Đặc biệt cho Storefront listing.
4. **Không over-index** — Mỗi index tốn disk space và làm chậm INSERT/UPDATE.

### Index quan trọng nhất (Storefront Performance)

```sql
-- Sản phẩm: Lọc + Sắp xếp trên trang danh sách
CREATE INDEX idx_com_products_sorting ON com_products(
  status,        -- WHERE status = 'active'
  in_stock,      -- ORDER BY in_stock DESC
  is_recommend,
  is_bestseller,
  is_flashsale,
  created_at
);

-- Query mẫu:
SELECT * FROM com_products
WHERE status = 'active'
ORDER BY in_stock DESC, is_recommend DESC, is_bestseller DESC, created_at DESC
LIMIT 20 OFFSET 0;
```

---

## 8. Quy tắc mở rộng cho Suite/App

### Nguyên tắc

1. **Suite KHÔNG được sửa bảng Core (`wb_*`).** Chỉ được đọc qua Core API hoặc JOIN.
2. **Suite tạo bảng riêng với prefix riêng.** VD: Commerce = `com_*`, Education = `edu_*`.
3. **Suite có thể ĐĂNG KÝ thêm** permissions, roles, và menu items vào Core khi cài đặt.
4. **Suite có thể JOIN với `wb_users`** để liên kết Identity. VD: `com_customers.user_id → wb_users.id`.
5. **Khi gỡ Suite:** DROP tất cả bảng có prefix tương ứng + xóa permissions/menus/roles đã đăng ký.

### Ví dụ: Education Suite tạo bảng mới

```sql
-- Education Suite migration (chạy khi cài đặt)
CREATE TABLE edu_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  instructor_id TEXT REFERENCES wb_users(id),  -- JOIN Core users
  price REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE edu_students (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES wb_users(id),  -- JOIN Core Identity Hub
  enrolled_courses INTEGER DEFAULT 0,
  completed_courses INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Luồng dọn dẹp khi gỡ Suite

```
1. DROP TABLE edu_courses, edu_students, edu_quizzes, edu_certificates
2. DELETE FROM wb_permissions WHERE group_name IN ('courses','students')
3. DELETE FROM wb_menus WHERE app_slug = 'education'
4. DELETE FROM wb_role_permissions WHERE permission_id NOT IN (SELECT id FROM wb_permissions)
5. DELETE FROM wb_installed_apps WHERE slug = 'education'
6. DELETE Worker "webbios-suite-education" trên Cloudflare
→ Hệ thống sạch sẽ 100%
```

---

## 9. Cloudflare Usage Monitoring

### Theo dõi giới hạn tài nguyên

Dữ liệu tracking lưu trong `wb_settings`:

| Key | Group | Value |
|---|---|---|
| `usage.workers.requests.2026-06-03` | usage | `45230` |
| `usage.d1.reads.2026-06-03` | usage | `1250000` |
| `usage.d1.writes.2026-06-03` | usage | `8500` |
| `usage.r2.storage_bytes` | usage | `2415919104` |
| `system.cf_plan` | system | `"free"` |

### Giới hạn gói Free

| Tài nguyên | Free | Paid ($5/tháng) |
|---|---|---|
| Workers Requests | 100,000/ngày | Pay-as-you-go |
| D1 Reads | 5,000,000 rows/ngày | Pay-as-you-go |
| D1 Writes | 100,000 rows/ngày | Pay-as-you-go |
| D1 Storage | 5 GB | Pay-as-you-go |
| R2 Storage | 10 GB | Pay-as-you-go |

### Ngưỡng cảnh báo

| Mức | Ngưỡng | Hành động |
|---|---|---|
| 🟢 Bình thường | < 70% | Không hiện cảnh báo |
| 🟡 Cảnh báo | 70% - 90% | Banner vàng trên Dashboard |
| 🔴 Nguy hiểm | > 90% | Banner đỏ + gợi ý nâng cấp CF |

---

## 10. Seed Data (Dữ liệu khởi tạo)

Khi khách hàng chọn Blueprint và khởi tạo WebbiOS, hệ thống tự động nhập dữ liệu theo 2 giai đoạn:

### 10.1 Core Seed Data (MỌI Blueprint)

| Bảng | Dữ liệu |
|---|---|
| `wb_roles` | 5 roles hệ thống: `owner`, `admin`, `staff`, `viewer`, `customer` |
| `wb_permissions` | 8 permissions Core (dashboard, settings, users, apps, media) |
| `wb_role_permissions` | Gán quyền mặc định cho 5 roles |
| `wb_users` | 1 tài khoản Owner (email + password do khách nhập khi đăng ký) |
| `wb_settings` | Cấu hình mặc định: site.name, site.currency=VND, system.blueprint |
| `wb_menus` | Menu Core: "Tổng quan", "Cài đặt", "Ứng dụng" |

### 10.2 Suite Seed Data (Theo Blueprint)

**Blueprint "Web Bán hàng":**
- Cài Web Foundation + Commerce Suite
- Seed Web Foundation: 1 theme mặc định, trang "Giới thiệu", "Chính sách đổi trả"
- Seed Commerce: 3-5 loại SP mẫu, 10-15 SP mẫu, 5 khách hàng mẫu, 5 đơn hàng mẫu
- Đăng ký thêm 16 permissions thương mại (products, orders, customers, discounts...)
- Đăng ký menu: "Sản phẩm", "Đơn hàng", "Khách hàng", "Kho hàng", "Khuyến mãi"

**Blueprint "Mini-ERP":**
- Chỉ cài Commerce Suite (KHÔNG có Web Foundation)
- Seed Commerce: tương tự nhưng KHÔNG có theme, KHÔNG có trang tĩnh

**Blueprint "Web Công ty":**
- Chỉ cài Web Foundation (KHÔNG có Commerce Suite)
- Seed: 1 theme corporate, trang "Giới thiệu", "Dịch vụ", "Liên hệ", 2-3 bài blog mẫu

> Dữ liệu mẫu có thể bị xóa thông qua nút "Xóa dữ liệu demo" trên Dashboard.
