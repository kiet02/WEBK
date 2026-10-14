# Tài Liệu Kiểm Thử Đầu-Cuối (End-to-End Testing - E2E)

> **Tóm tắt trong 1 câu (TL;DR):**  
> Tài liệu hướng dẫn thiết kế, thực thi và quản lý bộ kiểm thử tự động **E2E (End-to-End)** bằng **Playwright** nhằm mô phỏng 100% hành vi của người dùng thật trên trình duyệt (từ nạp file game, phân tab hội thoại, cấu hình đại từ nhân vật đến tải file patch ZIP).

---

## 1. 🎯 Kiểm Thử E2E Là Gì & Tại Sao Cần E2E?

Trong dự án **GameLingo AI Studio**, hệ thống bao gồm nhiều thành phần phối hợp phức tạp:
* Giao diện người dùng Next.js 16 (App Router, Tailwind CSS v4, Dark mode).
* Bộ parser trích xuất cấu trúc dữ liệu game (RPG Maker JSON, Ren'Py, Unity).
* Hệ thống phân tab hội thoại (20 câu / Tab), modal cấu hình nhân vật và đại từ xưng hô.
* Công cụ đóng gói tệp nén ZIP và kết nối máy chủ dịch thuật.

### Kim Tự Tháp Kiểm Thử Trong Dự Án (Testing Pyramid)

```
        / \
       /   \        Kiểm thử E2E (Playwright)
      / E2E \       ➔ Kiểm tra toàn bộ luồng người dùng thật trên trình duyệt
     /-------\
    / Story-  \     Kiểm thử Component & Tương tác (Storybook Play Functions)
   /   book    \    ➔ Kiểm tra từng nút bấm, modal, form trong môi trường cô lập
  /-------------\
 /   Unit Test   \  Kiểm thử Đơn vị (Vitest)
/_________________\ ➔ Kiểm tra các hàm logic thuần túy (Tag Masker, Regex, Parser)
```

* **Unit Test (`npm run test:unit`)**: Đảm bảo các hàm regex tag, parser chạy đúng với các chuỗi đầu vào.
* **Storybook Test (`npm run test:storybook`)**: Đảm bảo component Button, Badge, Card hiển thị đúng trạng thái.
* **E2E Test (`npm run test:e2e`)**: Đảm bảo **toàn bộ ứng dụng hoạt động trơn tru cùng nhau khi người dùng click chuột thật trên trình duyệt**.

---

## 2. 🏗️ Kiến Trúc & Cấu Hình Playwright

Dự án sử dụng **Playwright Test** kết hợp cùng tính năng tự động khởi động server của Next.js:

* **Tệp cấu hình:** [`playwright.config.ts`](file:///Users/mn20/Projects/Test/playwright.config.ts)
* **Thư mục chứa kịch bản test:** [`e2e/`](file:///Users/mn20/Projects/Test/e2e)
* **Cơ chế WebServer:** Playwright tự động chạy lệnh `npm run dev` trên cổng `3000` trước khi chạy test, và tự tắt khi hoàn thành.

```typescript
// Trích xuất cấu hình playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true, // Chạy ngầm không mở cửa sổ trên CI
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

---

## 3. 📋 5 Kịch Bản Kiểm Thử E2E Cốt Lõi (Core User Flows)

Mọi luồng quan trọng của ứng dụng được bao phủ bởi các kịch bản kiểm thử sau:

### Flow 1: Nạp Dự Án Mẫu & Nhận Diện Engine
* **Mục tiêu:** Đảm bảo khi người dùng bấm vào một dự án mẫu (ví dụ: *RPG Maker MV/MZ*), hệ thống nạp đúng dữ liệu.
* **Các bước kiểm tra:**
  1. Truy cập trang chủ `/`.
  2. Bấm nút dự án mẫu **"RPG Maker MV/MZ"**.
  3. Xác minh tiêu đề bảng hiển thị đúng badge `RPG Maker MV/MZ`.
  4. Xác minh bảng thống kê hiển thị số lượng câu thoại `> 0`.

### Flow 2: Phân Tab Hội Thoại (20 câu / Tab)
* **Mục tiêu:** Kiểm tra cơ chế chia tab giúp chống lag khi có nhiều câu thoại.
* **Các bước kiểm tra:**
  1. Kiểm tra dải tab hiển thị `Tab 1`, `Tab 2`,...
  2. Bấm sang `Tab 2`.
  3. Xác minh câu thoại hiển thị chuyển từ `#1–#20` sang `#21–#40`.
  4. Bấm nút `◀ Tab trước` và `Tab sau ▶` để xác minh chuyển tab mượt mà.

### Flow 3: Bộ Lọc Trạng Thái & Tìm Kiếm Câu Thoại
* **Mục tiêu:** Kiểm tra chức năng tìm kiếm câu thoại và bộ lọc trạng thái.
* **Các bước kiểm tra:**
  1. Nhập từ khóa vào ô tìm kiếm (Ví dụ: *"traveler"*).
  2. Xác minh các dòng hiển thị đều chứa từ khóa.
  3. Bấm vào lọc `Chưa dịch` / `Đã dịch` / `Đã duyệt` và kiểm tra số lượng khớp với badge thống kê.

### Flow 4: Quản Lý Nhân Vật & Sửa Lệch Đại Từ (Pronoun Engine)
* **Mục tiêu:** Kiểm tra modal nhân vật và tính năng tự động sửa đại từ *"Tôi - Bạn"*.
* **Các bước kiểm tra:**
  1. Bấm nút **"🎭 Đại Từ & Nhân Vật"** trên thanh tiêu đề.
  2. Xác minh modal mở ra với danh sách nhân vật (Trưởng làng, Hiệp sĩ, Pháp sư,...).
  3. Đóng modal.
  4. Bật chế độ **"🎨 Tô Màu Đại Từ"** và xác minh nhãn chuyển sang `BẬT`.
  5. Nếu có câu cảnh báo `⚠️ Lệch đại từ`, bấm **"🪄 Sửa đại từ"** và kiểm tra cảnh báo biến mất.

### Flow 5: Chỉnh Sửa Trực Tiếp & Tải Bản Vá ZIP
* **Mục tiêu:** Đảm bảo người dùng có thể sửa nội dung trong ô `textarea` và tải patch về máy.
* **Các bước kiểm tra:**
  1. Nhập bản dịch thử nghiệm vào ô dịch của câu #1.
  2. Xác minh trạng thái chuyển sang đã dịch.
  3. Bấm nút duyệt câu (`Duyệt` ➔ `✓ Đã Duyệt`).
  4. Bấm nút **"📦 Tải Bản Vá (ZIP)"** và lắng nghe sự kiện `page.waitForEvent('download')` thành công.

---

## 4. 🚀 Hướng Dẫn Chạy Kiểm Thử E2E

### 4.1. Lệnh Thực Thi Cơ Bản

```bash
# 1. Chạy toàn bộ bài test E2E (Chế độ Headless - nhanh nhất)
npm run test:e2e

# 2. Mở giao diện trực quan Playwright UI (Rất trực quan, xem từng thao tác)
npx playwright test --ui

# 3. Chạy xem trực tiếp trình duyệt mở lên (Headed mode)
npx playwright test --headed

# 4. Chạy riêng 1 tệp kịch bản
npx playwright test e2e/game-translator.spec.ts
```

### 4.2. Xem Báo Cáo & Phân Tích Lỗi (Debugging)

```bash
# Mở báo cáo HTML trực quan sau khi chạy test
npx playwright show-report

# Mở trình xem vết lỗi (Trace Viewer) khi test bị fail
npx playwright show-trace test-results/.../trace.zip
```

---

## 5. 🛡️ Quy Chuẩn Viết Test Playwright Bền Vững (Best Practices)

Để bài test **không bị chập chờn (flaky)** và chạy ổn định lâu dài:

1. **Ưu tiên Locators theo chuẩn Semantic & Accessibility:**
   * ✅ **Nên dùng:** `page.getByRole('button', { name: 'Dịch AI' })`
   * ✅ **Nên dùng:** `page.getByPlaceholder('Tìm kiếm câu thoại...')`
   * ✅ **Nên dùng:** `page.getByText('Làng Khởi Đầu Eldoria')`
   * ❌ **Không nên dùng:** `page.locator('.p-3 > div.flex > button.border-zinc-200')` *(Dễ gãy khi đổi class CSS Tailwind)*.

2. **Tận dụng tính năng Tự Chờ (Auto-waiting):**
   * Playwright tự động chờ phần tử hiển thị, clickable trước khi click.
   * **Tuyệt đối không dùng** `await page.waitForTimeout(3000)` bừa bãi.
   * Dùng `await expect(locator).toBeVisible()` hoặc `await expect(locator).toHaveText(...)`.

3. **Tách biệt dữ liệu kiểm thử (Test Isolation):**
   * Mỗi bài test phải chạy độc lập, không phụ thuộc vào trạng thái của bài test trước đó.

---

## 6. 🤖 Tích Hợp CI/CD (GitHub Actions)

Mẫu cấu hình chạy kiểm thử tự động trên GitHub Actions khi tạo Pull Request:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```
