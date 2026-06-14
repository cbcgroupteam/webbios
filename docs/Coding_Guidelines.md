# Cẩm nang Tiêu chuẩn Lập trình (WebbiOS Coding Guidelines)

Tài liệu này đóng vai trò "Kim chỉ nam" định hình tư duy và cách thức viết code cho dư án WebbiOS. Tất cả các lập trình viên tham gia dự án đều phải tuân thủ nghiêm ngặt để đảm bảo hệ thống dễ quản lý, dễ bảo trì, dễ mở rộng và chặn đứng các rủi ro bảo mật.

---

## 1. Nguyên tắc Tổng quan (Core Principles)

*   **DRY (Don't Repeat Yourself)**: Không bao giờ lặp lại cùng một đoạn mã (logic, UI components, types) ở hai nơi khác nhau. Mọi mã nguồn dùng chung phải được đóng gói vào các package nội bộ như `@webbios/shared`, `@webbios/db`, `@webbios/ui`.
*   **KISS (Keep It Simple, Stupid)**: Ưu tiên sự đơn giản, rõ ràng, minh bạch. Code dễ đọc và dễ bảo trì quan trọng hơn một giải pháp thông minh nhưng lắt léo.
*   **Single Responsibility Principle (Nguyên lý Đơn Trách Nhiệm)**: Mỗi hàm (function), lớp (class) hoặc component chỉ nên làm MỘT nhiệm vụ duy nhất. Logic xử lý CSDL không nằm chung file với logic render UI.

---

## 2. Quản lý Architecture (Kiến trúc Monorepo)

*   **Type-Safe Xuyên Suốt**: Khai báo kiểu dữ liệu mạnh mẽ với TypeScript. **Tuyệt đối không sử dụng type `any`**. Schema của D1 Database phải được đóng gói tại package trung tâm (`@webbios/db`) và xuất khẩu Types cho mọi ứng dụng con sử dụng.
*   **Chia nhỏ Gói Code (Packages)**: 
    *   `apps/`: Các ứng dụng độc lập (API, Dashboard).
    *   `packages/`: Thư viện lõi tái sử dụng (Shared, DB, UI).
*   **API (Hono.js)**: Tuân thủ mô hình 3 lớp: **Route -> Service -> Database**.
    - **Route**: Định nghĩa endpoint, validation, response.
    - **Service**: Logic nghiệp vụ.
    - **Database**: Drizzle ORM thao tác với D1.

---

## 3. Quy chuẩn Phân chia Thư Mục (Directory Structure)

Áp dụng Cấu trúc Dựa trên Tính năng (Feature-based/Domain-driven).

*   **Bên trong ứng dụng (VD: apps/api)**:
    *   `src/modules/`: Chứa logic chia theo Miền Nghiệp vụ (Domain). Ví dụ: `src/modules/orders/` sẽ chứa `order.controller.ts`, `order.service.ts`, `order.schema.ts`.
    *   `src/shared/`: Code dùng chung chỉ riêng cho app này.
*   **Tên File (File Naming Conventions)**:
    *   Sử dụng định dạng `kebab-case`. Đuôi file phải báo hiệu chức năng: `.controller.ts`, `.service.ts`, `.schema.ts`, `.utils.ts`. 

---

## 4. Quản trị Bảo mật & Lỗi (Security & Error Handling)

*   **Zero Trust Architecture**: Không bao giờ được tin tưởng input từ client. 100% Request Body, Query, Params phải đi qua lưới lọc xác thực (Zod) tại Middleware trước khi vào Controller. Validation Schema đặt tại `@webbios/shared`.
*   **Centralized Error Handling**: Mọi ngoại lệ trong API phải đẩy về trình xử lý lỗi toàn cục (`app.onError`). Không trả JSON báo lỗi kèm tiếng Việt trong logic. Trả về format chuẩn:
    ```json
    { "success": false, "error_code": "PRODUCT_NOT_FOUND", "message": "Product does not exist." }
    ```
*   **Bảo mật Thông tin**: Không bao giờ commit Keys/Secrets vào repo. Dùng biến môi trường Cloudflare Secrets.

---

## 5. Quy chuẩn Đặt tên (Naming Conventions)

*   **PascalCase**: Cho Tên Type, Interface, React Component (VD: `ProductCard`, `OrderInterface`).
*   **camelCase**: Cho Tên biến, Tên hàm, Instance (VD: `getUserProfile`, `totalAmount`).
*   **SNAKE_CASE**: Cho Hằng số cấu hình toàn cục (VD: `MAX_RETRY_COUNT`).
*   **Tiền tố rõ nghĩa**:
    *   Biến boolean (true/false) bắt đầu bằng `is`, `has`, `can`, `should` (VD: `isActive`, `hasPermission`).
    *   Hàm sự kiện UI bắt đầu bằng `handle` hoặc `on` (VD: `handleSubmit`, `onClick`).
*   **Tên không chung chung**: Không dùng `data`, `info`, `res`. Hãy dùng `productList`, `userData`.
*   **Database Table Prefix**: Mọi bảng trong D1 Database PHẢI có prefix theo Layer:
    *   `wb_` — Core Kernel (VD: `wb_users`, `wb_settings`)
    *   `web_` — Web Foundation (VD: `web_articles`, `web_nav_menus`)
    *   `com_` — Commerce Suite (VD: `com_products`, `com_orders`)
    *   `edu_` — Education Suite, `ppl_` — People Suite, `bkg_` — Booking Suite, `evt_` — Event Suite, `gen_` — Genealogy Suite

---

## 6. Lộ trình Git & Quy trình Code (Version Control)

*   **Quy chuẩn Tên Commit (Conventional Commits)**:
    *   `feat: [Mô tả]`: Thêm tính năng mới (Ví dụ: `feat: Thêm API tạo đơn hàng`).
    *   `fix: [Mô tả]`: Sửa lỗi (Ví dụ: `fix: Sửa lỗi hiển thị nút Xóa`).
    *   `refactor: [Mô tả]`: Viết lại code, không làm thay đổi chức năng.
    *   `docs: [Mô tả]`: Cập nhật tài liệu chữ (PRD, Guidelines).
    *   `style: [Mô tả]`: Format tab, khoảng trắng.
    *   `chore: [Mô tả]`: Cập nhật dependencies, build script.

---

## 7. Quản lý Shared Packages (`@webbios/shared`)

*   Toàn bộ Types, Interfaces nghiệp vụ (`Order`, `Product`) phải nằm ở đây.
*   Logic tính toán tài chính như `calculateOrderTotal()` để Frontend và Backend luôn ra cùng kết quả.
*   Zod Schemas dùng chung cho validation (VD: `OrderCreateSchema`).

---

## 8. Quy chuẩn UI Components (WebbiOS Design Language)

*   **Sử dụng Chung Component Lõi (Single Source of Truth)**: Mọi thành phần giao diện cơ bản (như Nút bấm - Button, Ô nhập liệu - Input, Dropdown, Table...) trên TOÀN BỘ hệ thống (từ trang Login, Dashboard, cho đến các trang con) **BẮT BUỘC phải import từ thư viện `@webbios/ui`**. Tuyệt đối không viết lại các thẻ HTML thuần túy (ví dụ `<button>`, `<input>`) kết hợp với class Tailwind thủ công để tránh phân mảnh thiết kế và rác code.
*   Sử dụng Tailwind CSS làm nền tảng (WebbiOS Design Language - WDL).
*   Các UI Components chung (`@webbios/ui`) không được truyền custom class (`className`) tùy tiện (như màu sắc, font chữ) để đảm bảo tính đồng nhất giao diện toàn hệ thống, trừ khi dùng cho mục đích căn chỉnh layout (margin, width, height).
*   Component chia làm 2 cấp:
    1. **Core UI Components** (`@webbios/ui`): Button, Input, Card, Table...
    2. **Module Components** (`apps/dashboard/src/modules/orders/components`): Component phức tạp gắn với nghiệp vụ (VD: `OrderSummaryCard`).

---

## 9. Quản lý Tài liệu Kỹ thuật (Technical Documentation)

Để dự án dễ bảo trì, mọi tính năng mới đều phải đi kèm với tài liệu kỹ thuật được lưu trong thư mục `docs/`.
*   **PRD.md**: Lưu giữ tổng quan kiến trúc và luồng nghiệp vụ.
*   **Feature Docs**: Khi làm module mới, tạo file thiết kế trong `docs/features/`. (Ví dụ: `docs/features/Product_Module.md` mô tả DB Schema, API Endpoints, UI Design cho module Sản phẩm).
*   **Cập nhật liên tục**: Code thay đổi, tài liệu cũng phải được cập nhật đồng bộ.

### Quy định viết tài liệu mã nguồn (WebbiSDK JSDoc)
Để hệ thống WebbiOS Developer Portal (docs.webbios.dev) tự động sinh ra tài liệu chuẩn xác, **bất kỳ ai khi cập nhật hoặc thêm mới code vào `packages/sdk` đều BẮT BUỘC tuân thủ các quy định sau**:
1. **Tiếng Anh 100%**: Tất cả các comment phải được viết bằng tiếng Anh.
2. **Comment cho MỌI Export**: Bất kỳ class, interface, type, method, hoặc property nào được export ra ngoài (public API) đều phải có comment JSDoc đi kèm. ĐỪNG BAO GIỜ quên viết JSDoc cho các tính năng mới trong SDK.
3. **Cấu trúc JSDoc chuẩn**:
   - Dòng đầu tiên: Mô tả ngắn gọn chức năng (Summary).
   - `@param {tên_biến}`: Mô tả rõ ràng mục đích của từng tham số.
   - `@returns`: Mô tả dữ liệu trả về (nếu có).
   - `@throws`: Ghi chú các lỗi có thể xảy ra (nếu có).
   - `@example`: Khuyến khích thêm ví dụ cách sử dụng hàm (đặc biệt là các hàm phức tạp).
4. **Auto-Generate**: Hệ thống sẽ dùng `TypeDoc` và `Astro Starlight` để quét tự động các comment này. Nếu bạn viết sai format, tài liệu trên Developer Portal sẽ bị hiển thị sai lệch.
5. **Enforcement**: NGHIÊM CẤM merge code hoặc commit code vào `packages/sdk` nếu chưa hoàn thiện 100% JSDoc theo chuẩn trên. Mọi đoạn code SDK thiếu tài liệu sẽ bị coi là code lỗi.

---

## 10. Quy chuẩn Đa ngôn ngữ (i18n - Internationalization)

Toàn bộ các văn bản (text) hiển thị trên giao diện người dùng (UI) bắt buộc phải tuân thủ chuẩn đa ngôn ngữ:

*   **Tuyệt đối không Fix Cứng (Hardcode)**: Không được gõ trực tiếp chữ Tiếng Việt hoặc Tiếng Anh vào trong các component React (VD: Không dùng `<button>Lưu</button>`).
*   **Sử dụng react-i18next**: Tất cả text phải được gọi thông qua hook `useTranslation()` (VD: `<button>{t('common.save')}</button>`).
*   **Cấu trúc file ngôn ngữ**: Từ khóa dịch thuật phải được lưu tập trung tại thư mục `src/locales/` dưới định dạng JSON (`en.json`, `vi.json`).
*   **Quy tắc đặt Key**: Đặt tên key theo cấu trúc phân tầng logic: `[tên_trang].[khu_vực].[tên_nút_hoặc_nhãn]`. (VD: `dashboard.analytics.cpuTime` hoặc `sidebar.accountHome`).
*   **Cập nhật đồng bộ**: Khi thêm một tính năng mới, lập trình viên phải có trách nhiệm bổ sung đầy đủ các từ khóa vào **CẢ HAI** file ngôn ngữ (`en.json` và `vi.json`). Mặc định ngôn ngữ của hệ thống là Tiếng Việt (`vi`).
