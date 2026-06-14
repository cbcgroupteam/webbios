# WebbiOS Platform — Product Requirements Document (PRD)

> **Version:** 1.0.0
> **Ngày tạo:** 2026-06-04
> **Cập nhật lần cuối:** 2026-06-05
> **Tác giả:** WebbiOS Team

---

## 1. Tổng quan Platform

**WebbiOS Platform** là "nhà máy sản xuất" và "trung tâm điều khiển" của toàn bộ hệ sinh thái WebbiOS. Platform được xây dựng bằng chính WebbiOS Core (dogfooding) và bổ sung thêm **Platform Suite** (`plt_*` tables) để quản lý hệ sinh thái.

### 1.1. Vai trò của Platform
1. **Marketplace:** Nơi cung cấp (chợ) Apps, Suites và Themes cho khách hàng.
2. **License & Billing:** Quản lý bản quyền, gói cước (subscriptions), thanh toán và đối soát.
3. **Developer Portal:** Cung cấp tài liệu (`docs.webbios.dev`), quản lý API keys, nơi đối tác submit App/Theme.
4. **Cloudflare Integration:** Tương tác với Cloudflare API để tự động tạo Worker, D1, KV, Pages cho khách hàng khi họ đăng ký hoặc mua Suite/App.
5. **Blueprint Registry:** Lưu trữ và quản lý các công thức đóng gói (Blueprint) để khách hàng chọn loại website khi đăng ký.

### 1.2. Kiến trúc 3 tầng
- **Tầng 1 (Platform):** `api.webbios.dev` và `webbios.dev` (Quản lý hệ sinh thái).
- **Tầng 2 (Regional Clients):** Các đại lý phân phối như `webbi.vn` (thị trường Việt Nam) hay `getwebbi.com` (Quốc tế). Các client này gọi API từ Platform để đăng ký tài khoản cho khách.
- **Tầng 3 (End-user):** Các shop của khách hàng (ví dụ `shop-abc.com`). Mỗi shop chạy một bản WebbiOS Core độc lập.

---

## 2. Platform Architecture

### 2.1. Kiến trúc: Platform = WebbiOS Core + Platform Suite

Platform **KHÔNG** dùng database hay hệ thống auth riêng. Thay vào đó:

- **WebbiOS Core** (cài tại `admin.webbios.dev`) cung cấp: Identity Hub (`wb_users`), RBAC (`wb_roles`, `wb_permissions`), Auth (`wb_sessions`), Menu, Settings, Audit Logs.
- **Platform Suite** (cài như một app) bổ sung thêm các bảng `plt_*` vào cùng database D1 để quản lý: Shops, Licenses, App Listings, Partners, Affiliates, Transactions.

### 2.2. Cấu trúc Repo

Platform là một **repo riêng biệt** (`WebbiPlatform`), codebase: E:\WebbiPlatform, tách biệt hoàn toàn khỏi WebbiOS Core repo:

```
WebbiOS (Core Monorepo)              WebbiPlatform (Repo riêng)
┌───────────────────────┐            ┌────────────────────────────┐
│  apps/                │            │  apps/                     │
│  ├── api/    (Kernel) │            │  ├── platform.webbios.dev/ │
│  └── dashboard/ (UI)  │            │  │   └── (Platform Suite)  │
│                       │            │  └── webbios.dev/          │
│  packages/            │            │      └── (Marketing web)   │
│  ├── db/     (wb_*)   │            │                            │
│  ├── shared/          │            │  packages/                 │
│  ├── sdk/             │            │  └── db/                   │
│  └── ui/              │            │      └── (plt_* schema)    │
│                       │            │                            │
│  apps/docs/           │            │                            │
│  └── docs.webbios.dev │            │                            │
└───────────────────────┘            └────────────────────────────┘
```

> ⚠️ `docs.webbios.dev` nằm trong repo WebbiOS vì tài liệu gắn liền với mã nguồn Core (co-location).

### 2.3. Tên miền & Vai trò

| Tên miền | Vai trò | Nơi deploy |
|---|---|---|
| `admin.webbios.dev` | Dashboard quản trị Platform (WebbiOS Core instance) | CF Pages |
| `platform.webbios.dev` | API Gateway — Platform Suite (Worker) | CF Workers |
| `webbios.dev` | Web giới thiệu tiếng Anh, Marketplace UI | CF Pages |
| `docs.webbios.dev` | Tài liệu kỹ thuật (Astro Starlight) | CF Pages |

### 2.4. God Instance & Bootstrap

`admin.webbios.dev` là **God Instance** — bản WebbiOS duy nhất không cần kiểm tra license vì chính nó là nguồn quản lý license.

Cấu hình thông qua **Environment Variable** trong `wrangler.toml` (không phải database):

```toml
# wrangler.toml của God Instance
[vars]
INSTANCE_TYPE = "platform"

# wrangler.toml của shop khách hàng
[vars]
INSTANCE_TYPE = "shop"
```

**Quy trình Bootstrap (giải quyết bài toán Con gà - Quả trứng):**

Để cài app từ Kho ứng dụng → cần gọi API Platform (`platform.webbios.dev`). Nhưng Platform chưa cài → chưa có API.

Giải pháp: Dùng CLI (`@webbi/cli`) để cài trực tiếp, không qua Kho ứng dụng:

```
Bước 1: webbi init          ← CLI tạo D1, deploy Core, seed data, set INSTANCE_TYPE="platform"
Bước 2: webbi install <zip> ← CLI cài Platform Suite trực tiếp (tạo plt_*, deploy Worker)
Bước 3+: Kho ứng dụng hoạt động bình thường (gọi api.webbios.dev)
```

---

## 3. Database

Platform Suite sử dụng prefix `plt_*`, nằm chung database D1 với Core (`wb_*`).

*(Xem chi tiết tại `Platform_Database_Schema.md`)*

**Những gì Core cung cấp sẵn (không tạo lại):**
- `wb_users` — Identity Hub cho Webbi Team
- `wb_roles`, `wb_permissions` — RBAC
- `wb_sessions` — Auth
- `wb_menus` — Sidebar navigation
- `wb_settings` — System config
- `wb_audit_logs` — Activity tracking
- `wb_installed_apps` — Registry: app nào đang cài trên hệ thống

**Bảng Platform Suite bổ sung (`plt_*`):**
- `plt_shops` — Danh sách shop khách hàng
- `plt_licenses` — Bản quyền
- `plt_app_listings` — Marketplace listings
- `plt_app_versions` — Phiên bản app
- `plt_partners` — Developer/Partner profiles (liên kết `wb_users`)
- `plt_transactions` — Giao dịch
- `plt_blueprints` — Công thức đóng gói
- `plt_affiliates` — Affiliate partners
- `plt_referrals` — Referral tracking
- `plt_affiliate_commissions` — Hoa hồng
- `plt_core_versions` — Phiên bản WebbiOS Core
- `plt_announcements` — Thông báo hệ thống
- `plt_announcement_logs` — Theo dõi gửi/đọc

---

## 4. Luồng hoạt động chính

### 4.1. Luồng cấp phép (Licensing & Provisioning)
Khi một khách hàng đăng ký dịch vụ từ một Regional Client (VD: `webbi.vn`):
1. Client gửi yêu cầu tạo shop tới `platform.webbios.dev`.
2. Platform API gọi Cloudflare API để:
   - Tạo D1 Database.
   - Cấu hình Worker cho Core API (set `INSTANCE_TYPE="shop"`).
   - Deploy Dashboard UI lên CF Pages.
3. Platform ghi nhận thông tin `shop_id` vào `plt_shops`, cấp License vào `plt_licenses`.

### 4.2. Cài đặt App (App-as-Worker)
WebbiOS sử dụng mô hình App-as-Worker. Khi khách hàng cài đặt CRM App:
1. Core API của khách gửi request tới Platform API kiểm tra license.
2. Platform kiểm tra App là miễn phí hay trả phí, khách đã mua chưa.
3. Nếu hợp lệ, Platform trả về link download ZIP từ R2.
4. Core API tự động gọi Cloudflare API để deploy một Worker mới chứa code của CRM App.
5. CRM App hoạt động hoàn toàn độc lập với Core API.

### 4.3. Marketplace dành cho Developer
1. Developer đăng ký tài khoản Partner trên `webbios.dev`.
2. Phát triển App dựa trên `@webbi/sdk` và chạy `webbi publish` qua CLI.
3. Source code (ZIP) được upload lên R2 của Platform.
4. Platform API tạo bản nháp (Draft) trong bảng `plt_app_listings`.
5. Đội ngũ Webbi review và Approve. App chính thức lên kệ Marketplace.

---

## 5. Bảo mật License & Chống vi phạm bản quyền

1. **Không lưu License trên DB khách hàng:** Bảng `plt_licenses` chỉ nằm trên God Instance (Platform).
2. **Heartbeat Check:** Định kỳ 24h, Core API của khách (có `INSTANCE_TYPE="shop"`) sẽ ping về `platform.webbios.dev` kèm theo token để xác thực. God Instance (`INSTANCE_TYPE="platform"`) bỏ qua bước này.
3. **App Checksum:** Khi tải App từ Marketplace, Core sẽ verify checksum để đảm bảo code không bị can thiệp.
4. **Revocation:** Nếu phát hiện vi phạm hoặc khách không đóng phí, Platform có thể thu hồi quyền bằng cách block request qua Cloudflare WAF hoặc xóa Worker thông qua CF API.
5. **INSTANCE_TYPE bảo mật:** Lưu trong env var của Worker (không phải database), khách hàng không thể tự sửa thành "platform" để bypass license check.

---

## 6. Quản lý Phiên bản & Deploy tự động

### 6.1. Luồng phát hành Core (CI/CD)
1. Webbi Team push mã nguồn lên nhánh chính (hoặc tạo Git Tag `v1.2.0`).
2. **GitHub Actions** tự động build mã nguồn.
3. CI gửi request tới Platform API.
4. Platform API ghi nhận phiên bản mới vào bảng `plt_core_versions` và lưu file bundle lên R2.
5. Dashboard khách hàng tự động nhận thông báo (Red dot) nhờ cơ chế kiểm tra ngầm (Background Polling).

### 6.2. Luồng phát hành Apps/Themes (CLI)
1. Lập trình viên chạy lệnh `webbi publish` từ máy tính cục bộ.
2. CLI đóng gói (zip) dự án và gửi `POST /v1/developer/publish` tới Platform API.
3. Platform API lưu file zip lên R2 và tạo bản ghi mới trong `plt_app_versions`.
4. **Tải mã nguồn (Source Bundle):**
   - Lấy `bundle_url` từ `plt_app_versions`.
   - Ví dụ: `webbios-apps/{app_slug}/webbios-app-{version}.zip`.
   - Fetch từ R2 bucket `webbios-platform`.
5. Phiên bản mới tự động khả dụng trên Marketplace cho khách hàng nâng cấp (1-Click Update).

---

## 7. Cơ chế API Gateway & Ecosystem Lock-in

Để bảo vệ lợi thế cạnh tranh cốt lõi (Bàn giao Code + Database) mà vẫn đảm bảo dòng tiền từ hệ sinh thái, WebbiOS áp dụng kiến trúc **Centralized API Gateway**.

### 7.1. Nguyên lý hoạt động (Soft Lock-in)

Khách hàng sở hữu hoàn toàn mã nguồn và Database. Website hoạt động vĩnh viễn trên bất kỳ nền tảng nào.
Tuy nhiên, để sử dụng các **Dịch vụ Giá trị Gia tăng** (Thanh toán, Vận chuyển, Chatbot...), Core API của khách hàng **phải đi qua cổng** `platform.webbios.dev`.

### 7.2. Lợi ích
1. **Bảo mật Token đối tác:** Khách hàng không biết API Key gốc của GHTK, GHN, VNPAY. Master Token nằm ở `platform.webbios.dev`.
2. **Kiểm soát doanh thu (Kickback):** Platform ghi nhận volume giao dịch để đối soát hoa hồng.
3. **Kill Switch:** Thu hồi License → toàn bộ dịch vụ giá trị gia tăng tê liệt.

---

## 8. Blueprint Registry

Blueprint là công thức đóng gói 1-click, định nghĩa Core + Suite + Theme nào được cài tự động khi khách hàng đăng ký.

### 8.1. Cấu trúc Blueprint (JSON)

```json
{
  "slug": "ecommerce",
  "name": "Website Bán hàng",
  "description": "Bán hàng online + offline, tích hợp thanh toán & vận chuyển",
  "icon": "shopping-cart",
  "suites": ["web-foundation", "commerce"],
  "addons": ["seo", "analytics"],
  "theme": "starter-shop",
  "suite_config": {
    "commerce": {
      "pos_enabled": false,
      "crm_enabled": false
    }
  },
  "seed_pages": ["home", "about", "contact", "faq"]
}
```

### 8.2. Danh sách Blueprint mặc định

| Blueprint | Slug | Suites | Có Web Foundation? |
|---|---|---|---|
| Website Bán hàng | `ecommerce` | Commerce | ✅ |
| Mini-ERP | `mini-erp` | Commerce | ❌ |
| Web Công ty | `corporate` | *(không)* | ✅ |
| Landing Page | `landing` | *(không)* | ✅ |
| Blog | `blog` | *(không)* | ✅ |
| Trường học | `education` | Education | ✅ |
| Nhà hàng / Spa | `booking` | Booking + Commerce | ✅ |
| Sự kiện | `event` | Event | ✅ |
| Gia phả | `genealogy` | Genealogy | ✅ |
| HRM nội bộ | `hrm` | People | ❌ |
