# Hướng dẫn Build & Deploy (WebbiOS Deployment Guide)

Tài liệu này cung cấp hướng dẫn chi tiết cách thức chạy môi trường Development (Dev), Build và Deploy toàn bộ hệ sinh thái WebbiOS lên Cloudflare.

---

## 1. Môi trường Development (Local)

Hệ thống sử dụng `Turborepo` để quản lý các tác vụ xuyên suốt các ứng dụng trong monorepo. 

**Để chạy môi trường dev cho toàn bộ dự án:**
```bash
# Đứng tại thư mục gốc của dự án (e:\WebbiOS)
pnpm install
pnpm dev
```
Lệnh này sẽ tự động khởi chạy:
1. **Core API (`@webbios/api`)**: Khởi chạy Cloudflare Worker tại `http://localhost:8787`. Worker này sẽ kết nối trực tiếp với database D1 trên môi trường Cloudflare (nhờ flag `--remote` và sử dụng `preview_id`).
2. **Dashboard (`@webbios/dashboard`)**: Khởi chạy ứng dụng Vite React tại `http://localhost:5173`.
3. **Developer Portal (`docs`)**: Khởi chạy Astro Starlight tại `http://localhost:4321`. Quá trình tự động sinh tài liệu từ SDK sẽ được kích hoạt ngay lúc này thông qua `starlight-typedoc`.

---

## 2. Hệ thống Auto-Generated Docs (Developer Portal)

Trang tài liệu `developers.webbi.vn` nằm tại `apps/docs` sử dụng công nghệ **Astro Starlight**.

**Cơ chế hoạt động:**
- Mọi tài liệu mã nguồn (API Reference) được sinh ra hoàn toàn tự động từ các dòng comment `JSDoc` bên trong thư mục `packages/sdk`.
- Bất kì khi nào bạn chạy `pnpm dev` hoặc `pnpm build` tại `apps/docs` (hoặc thông qua lệnh turbo ở root), plugin `starlight-typedoc` sẽ tự động quét thư mục SDK, tạo ra các file Markdown lưu vào RAM và render trực tiếp thành giao diện web.
- **Không bao giờ sửa tay** nội dung trong phần *SDK Reference* trên trang web. Nếu muốn sửa, hãy sửa file `.ts` trong `packages/sdk`, hệ thống sẽ tự động đồng bộ.

---

## 3. Quy trình Deploy lên Cloudflare

WebbiOS được thiết kế 100% native với hệ sinh thái Cloudflare. Việc deploy được thực hiện thông qua `wrangler` CLI.

### 3.1. Deploy Core API (Hono.js Worker)
API đóng vai trò Kernel của hệ thống. Nó cần được deploy lên Cloudflare Workers.

```bash
# Đứng tại thư mục gốc
pnpm run deploy:api
```
*Lưu ý: Bạn cần đảm bảo đã cấu hình đúng `D1 Database ID`, `KV Namespace ID`, và `R2 Bucket` trong file `apps/api/wrangler.toml`.*

### 3.2. Deploy Dashboard Admin (Cloudflare Pages)
Dashboard là một ứng dụng SPA (Single Page Application) sử dụng React + Vite.

```bash
# Đứng tại thư mục gốc
pnpm run deploy:dashboard
```
Lệnh này thực hiện 2 việc:
1. Gọi `turbo run build --filter=@webbios/dashboard` để tạo ra thư mục tĩnh `dist`.
2. Gọi `wrangler pages deploy` để đẩy thư mục `dist` này lên dự án có tên `webbios-dashboard` trên Cloudflare Pages.

### 3.3. Deploy Developer Portal (Cloudflare Pages)
Trang tài liệu dành cho lập trình viên sử dụng Astro.

```bash
# Đứng tại thư mục gốc
pnpm run deploy:docs
```
Tương tự như Dashboard, lệnh này sẽ:
1. Chạy quá trình build của Astro. Quá trình này sẽ tự động gọi TypeDoc để sinh ra file markdown mới nhất từ SDK.
2. Build ra HTML tĩnh.
3. Deploy toàn bộ lên Cloudflare Pages vào dự án `webbios-docs`.

### 3.4. Đóng gói App và Phát hành Bản cập nhật

### Cơ chế Upload ZIP

Sau khi hoàn thành phát triển App, toàn bộ source (Worker + Dashboard assets) được đóng gói thành file ZIP và đưa lên R2. Quy tắc đặt tên và đường dẫn trên R2 bucket `webbios-platform` như sau:

- **WebbiOS Core**: `webbios-core/webbios-core-{version}.zip`
- **Apps/Suites**: `webbios-apps/{app_slug}/webbios-app-{app_slug}-{version}.zip` (lưu ý: version không có chữ `v` ở đầu, ví dụ: `1.0.5`)

> **⚠️ Lưu ý quan trọng cho Apps (Micro-frontend):**
> Vì Platform Runner được thiết kế dùng chung để deploy các dự án (như Next.js, Hono) yêu cầu quá trình `npm install`, nên khi bạn đóng gói một App tĩnh (chỉ chứa file build HTML/JS/CSS trong thư mục `dist`), bạn bắt buộc phải tạo một file `package.json` "ảo" bên trong thư mục `dist` trước khi nén zip. 
> File `package.json` này chỉ cần chứa `dependencies` rỗng và script `build: "echo 'Prebuilt'"` để lừa Platform Runner bỏ qua bước cài đặt gói, tránh lỗi "No package.json found".

### Luồng Testing trên Dev Account

**Tại sao cần Dev Account?** 
Vì Platform God Instance chạy chính trên WebbiOS Core. Việc update trực tiếp lên Production (Platform) có thể gây lỗi hệ thống quản lý các shop. Do đó, quy trình dev/test cần tuân thủ 3 môi trường:

1. **Local Development (localhost)**
   - `pnpm dev` để chạy test cục bộ (Wrangler local D1, R2).
   
2. **Dev Cloudflare Account** (Sử dụng `CLOUDFLARE_ACCOUNT_ID` trong `.env.dev`)
   - Dùng để deploy thử nghiệm nghiệm thu (UAT) trên hạ tầng Cloudflare thực tế.
   - Cấu hình qua file `apps/api/wrangler.toml` (với DB ID của dev account).
   - Lệnh deploy Dev:
     ```bash
     npx wrangler deploy
     npx wrangler pages deploy ../dashboard/dist --project-name webbios-dashboard-dev
     ```

3. **Production Cloudflare Account** (Sử dụng `CLOUDFLARE_ACCOUNT_ID` trong `.env.platform`)
   - Chỉ deploy/publish khi Dev test đã PASS 100%.
   - Chạy lệnh publish tự động đóng gói và đăng ký bản cập nhật:
     ```bash
     npx tsx scripts/publish.ts 1.0.30 "Nội dung cập nhật"
     ```

### Phát hành Bản cập nhật cho Khách hàng

Toàn bộ quy trình từ đóng gói, loại bỏ cache (để giảm dung lượng ZIP), tải lên R2, và gọi API đăng ký với Platform đều được tự động hóa thông qua script `publish.ts`.

Đảm bảo bạn đã cấu hình các biến môi trường sau trong file `.env` hoặc truyền trực tiếp vào terminal:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Thực thi lệnh sau:
```bash
# Đứng tại thư mục gốc (E:\WebbiOS)
# Cú pháp: npx tsx scripts/publish.ts <version> <"Nội dung cập nhật">
npx tsx scripts/publish.ts 1.0.23 "Bản cập nhật tối ưu dung lượng gói cài đặt"
```

Script sẽ thực hiện các bước sau:
1. **Đóng gói mã nguồn (Archive):** Sử dụng `tar` để nén mã nguồn, tự động loại trừ `.turbo`, `dist`, và các file `*.zip` cũ để đảm bảo dung lượng file siêu nhẹ (~500KB).
2. **Upload lên Cloudflare R2 (Remote):** Tự động gọi `wrangler r2 object put` để đẩy lên bucket `webbios-platform`.
3. **Đăng ký phiên bản mới:** Tự động gọi `POST https://platform.webbios.dev/api/v1/versions` để ghi nhận bản phát hành vào database của Platform. Lúc này các Shop sẽ thấy có bản cập nhật mới trên Dashboard.

---

## 4. Quản lý Cơ sở dữ liệu (D1 Database & SQL Migration)

WebbiOS sử dụng Cloudflare D1 (SQLite) làm cơ sở dữ liệu chính. Mọi thay đổi về cấu trúc bảng (schema) đều phải được thực hiện thông qua cơ chế Migration của Drizzle ORM để đảm bảo tính an toàn và khả năng rollback.

### 4.1. Tạo file Migration mới
Khi bạn thay đổi file định nghĩa Schema (ví dụ `apps/api/src/db/schema.ts`), bạn cần tạo một file SQL migration tương ứng:

```bash
# Đứng tại apps/api
pnpm run db:generate
```
Lệnh này sẽ so sánh mã nguồn TypeScript hiện tại với phiên bản trước đó và tự động sinh ra một file `.sql` trong thư mục `drizzle/`.

### 4.2. Áp dụng Migration (Thực thi lên DB)

**Đối với môi trường Local (Dev):**
```bash
# Đứng tại apps/api
pnpm run db:migrate:local
```
Lệnh này sẽ chạy các file `.sql` vào file cơ sở dữ liệu SQLite cục bộ (`.wrangler/state/v3/d1/`).

**Đối với môi trường Production (Cloudflare D1):**
```bash
# Đứng tại apps/api
pnpm run db:migrate:prod
```
Hệ thống sẽ áp dụng trực tiếp các file SQL này lên Cloudflare D1. Hãy kiểm tra kỹ trên môi trường Dev trước khi chạy lệnh này.

### 4.3. Database Table Prefix Convention

Theo kiến trúc 4-Layer, các bảng DB được phân tách bằng prefix:

| Layer | Prefix | Ví dụ |
|---|---|---|
| Core Kernel | `wb_` | `wb_users`, `wb_roles`, `wb_settings` |
| Web Foundation | `web_` | `web_articles`, `web_nav_menus` |
| Commerce Suite | `com_` | `com_products`, `com_orders` |
| Education Suite | `edu_` | `edu_courses`, `edu_students` |
| Platform Suite | `plt_` | `plt_shops`, `plt_licenses`, `plt_app_listings` |

Khi gỡ một Suite, hệ thống sẽ `DROP TABLE` tất cả bảng có prefix tương ứng.

> ⚠️ Platform Suite (`plt_*`) chỉ được cài trên God Instance (`admin.webbios.dev`). Các shop khách hàng thông thường không có bảng `plt_*`.

---

## 5. Deploy Suite/App (Worker riêng)

Mỗi Suite (Commerce, Education, Booking...) và mỗi App là một Worker riêng biệt, deploy độc lập.

### 5.1. Build và Deploy Suite

```bash
# Ví dụ: Deploy Commerce Suite
pnpm run deploy:suite:commerce
```

Lệnh này sẽ:
1. Build Commerce Suite Worker từ thư mục tương ứng.
2. Deploy Worker lên tài khoản Cloudflare.
3. Chạy Commerce migrations (tạo các bảng `com_*` trong D1 chung).
4. Đăng ký permissions và menu items vào Core.

### 5.2. Gỡ Suite

```bash
# Ví dụ: Gỡ Commerce Suite
pnpm run remove:suite:commerce
```

Lệnh này sẽ:
1. DROP tất cả bảng `com_*` trong D1.
2. Xóa permissions và menu items đã đăng ký.
3. DELETE Worker trên Cloudflare.
4. Xóa record trong `wb_installed_apps`.

---

## 6. Thiết lập biến môi trường & Secrets

Tuyệt đối không lưu các chuỗi bí mật (API Keys, JWT Secrets, Payment Tokens) vào mã nguồn. Để thêm biến môi trường an toàn trên Cloudflare:

```bash
# Đứng tại apps/api
npx wrangler secret put JWT_SECRET
```
Sau đó nhập giá trị bí mật vào terminal. Biến này sẽ được mã hóa và lưu trữ an toàn trên môi trường production của Cloudflare Workers.

### 6.1. Biến môi trường đặc biệt: INSTANCE_TYPE

Biến `INSTANCE_TYPE` trong `wrangler.toml` quy định loại instance:

| Giá trị | Ý nghĩa |
|---|---|
| `platform` | God Instance — bỏ qua license heartbeat check |
| `shop` | Shop khách hàng — chạy heartbeat bình thường |

> ⚠️ `INSTANCE_TYPE` **phải** nằm trong env var (wrangler.toml), không được lưu trong database (`wb_settings`) để ngăn chặn khách hàng tự cấp quyền.

---

## 7. Kiến trúc Deploy Tự động (Cloudflare REST API)

Đối với khách hàng (End-user), WebbiOS **không** sử dụng `wrangler.toml` để cấu hình biến môi trường, KV, hay Database ID. Hệ thống áp dụng luồng tự động hóa 100% qua Cloudflare REST API:

1. **Khởi tạo D1 / KV:** Platform API (`api.webbios.dev`) gọi Cloudflare REST API tạo `webbios_core_db` cho khách hàng. Cloudflare trả về `database_id`.
2. **Deploy Worker bằng API:** Platform lấy mã nguồn WebbiOS Core, đóng gói theo dạng `multipart/form-data`, kèm theo tệp `metadata` JSON định nghĩa Bindings.
3. **Dynamic Bindings:** Cloudflare tự động Bind D1 `webbios_core_db` thành biến `env.DB` bên trong Worker.
4. **Không cần cập nhật DB ID vào DB:** Worker tự động nhận được kết nối qua biến môi trường do Cloudflare cung cấp, mã nguồn không cần biết `database_id` là gì, không cần thiết lập bằng tay.

---

## 8. CLI Tools (`@webbi/cli`)

WebbiOS cung cấp CLI tool cho developer và admin:

```bash
npx @webbi/cli init        # Tạo WebbiOS instance mới (D1, Worker, seed)
npx @webbi/cli pack        # Đóng gói app/suite thành .zip
npx @webbi/cli install     # Cài app vào instance đang chạy
npx @webbi/cli upgrade     # Cập nhật Core lên phiên bản mới
npx @webbi/cli publish     # Đẩy app lên Marketplace
```

CLI đóng vai trò "USB Boot" — dùng để cài hệ điều hành và app lần đầu trước khi Kho ứng dụng (giao diện trên Dashboard) hoạt động.
