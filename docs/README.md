# Tài Liệu Dự Án (Project Documentation)

Chào mừng bạn đến với kho tài liệu của dự án. Dự án được khởi tạo trên nền tảng **Next.js 16 (Turbopack)**, **Tailwind CSS v4**, **TypeScript**, cùng bộ công cụ kiểm thử **Vitest & Storybook**.

---

## 🛠️ Hướng dẫn & Tiêu chuẩn phát triển (Workflows & Standards)

- **[📖 Sổ Tay Hướng Dẫn Sử Dụng (Dành Cho Người Mới Bắt Đầu)](file:///Users/mn20/Projects/Test/docs/USER-GUIDE.md)**: Hướng dẫn dịch game từ A đến Z cực kỳ dễ hiểu, không cần biết lập trình, 3 bước có ngay game tiếng Việt.
- **[Giai đoạn 1: Nền tảng Dịch thuật Game (Không Làm Hỏng Game)](file:///Users/mn20/Projects/Test/docs/phases/phase-1-game-translation-platform.md)**: Tự động nhận diện game (RPG Maker, Ren'Py, Unity), bảo vệ mã màu/biến số (`\V[1]`, `{i}`), dịch trọn câu và xuất bản vá ZIP chơi ngay.
- **[Giai đoạn 2: Tăng Tốc Dịch Thuật Bằng Python & WebGPU](file:///Users/mn20/Projects/Test/docs/phases/phase-2-python-hybrid-acceleration.md)**: Giải pháp dịch hàng chục nghìn câu thoại siêu tốc bằng Python đa luồng (50–100 câu/giây) và WebGPU dịch AI miễn phí trên card màn hình.
- **[Giai đoạn 3: Nhận Diện Nhân Vật & Đại Từ Xưng Hô Tự Nhiên](file:///Users/mn20/Projects/Test/docs/phases/phase-3-speaker-persona-pronoun-engine.md)**: Tự động gán đại từ thuần Việt theo vai vế (Trưởng lão xưng "Ta - Ngươi", Bé gái xưng "Cháu - Chú", Nữ vương xưng "Trẫm - Khanh"), loại bỏ triệt để dịch máy "Tôi - Bạn".
- **[Quy trình phát triển Component, Storybook & Testing](file:///Users/mn20/Projects/Test/docs/WORKFLOW.md)**: Hướng dẫn chi tiết về cấu trúc co-location, cách tạo Stories, tương tác test với Playwright Chromium và Vitest.
- **[Kiểm thử Đầu-Cuối E2E với Playwright](file:///Users/mn20/Projects/Test/docs/E2E-TESTING.md)**: Hướng dẫn chạy kiểm thử tự động toàn diện Playwright, các kịch bản nạp file, phân tab, đại từ nhân vật và tích hợp CI/CD.

---

## 📁 Cấu trúc thư mục dự án

```
.
├── .agents/                    # Kho Agent Skills và Rules được bảo lưu đầy đủ
│   ├── rules/                  # Quy chuẩn thiết kế & lập trình
│   └── skills/                 # Skills chuyên sâu (UI/UX, Docker, Next.js, Testing...)
├── docs/                       # Tài liệu dự án & quy trình làm việc
│   ├── README.md               # Tổng quan tài liệu
│   └── WORKFLOW.md             # Quy trình phát triển Component & Storybook
├── src/
│   ├── app/                    # Next.js 16 App Router (layout, page, globals.css)
│   ├── components/
│   │   └── ui/                 # UI Components tái sử dụng (Button, Card, Input, Badge, v.v.)
│   ├── hook/                   # Custom Hooks (useTheme, useLanguage, useDebounce, v.v.)
│   └── lib/                    # Utilities & i18n
├── skills-lock.json            # Lockfile quản lý Agent skills
└── AGENTS.md                   # Chỉ dẫn hoạt động cho AI Agent (Senior Dev Mode)
```

---

## 🚀 Các lệnh thường dùng

- `npm run dev`: Chạy môi trường phát triển Next.js dev server.
- `npm run test`: Chạy toàn bộ test suites (Vitest unit tests & Storybook tests).
- `npm run storybook`: Khởi chạy Storybook isolated visual component explorer.
- `npm run build`: Build phiên bản production của ứng dụng.
