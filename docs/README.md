# Tài Liệu Dự Án (Project Documentation)

Chào mừng bạn đến với kho tài liệu của dự án. Dự án được khởi tạo trên nền tảng **Next.js 16 (Turbopack)**, **Tailwind CSS v4**, **TypeScript**, cùng bộ công cụ kiểm thử **Vitest & Storybook**.

---

## 🛠️ Hướng dẫn & Tiêu chuẩn phát triển (Workflows & Standards)

- **[Giai đoạn 1: Nền tảng Dịch thuật Game Đa Engine](file:///Users/mn20/Projects/Test/docs/phases/phase-1-game-translation-platform.md)**: Đặc tả kỹ thuật, kiến trúc nhận diện engine tự động, đường ống bảo vệ escape code (Tag Guard) và sơ đồ Mermaid luồng dữ liệu.
- **[Giai đoạn 2: Python Hybrid Accelerator & WebGPU Engine](file:///Users/mn20/Projects/Test/docs/phases/phase-2-python-hybrid-acceleration.md)**: Tích hợp sidecar Python backend đa luồng (2.500+ chuỗi/giây), hardware auto-detect, WebGPU offline AI model và benchmark so sánh.
- **[Giai đoạn 3: Phân Tích Vai Trò & Đại Từ Nhân Xưng (Speaker Persona & Pronoun Engine)](file:///Users/mn20/Projects/Test/docs/phases/phase-3-speaker-persona-pronoun-engine.md)**: AI phân tích tính cách, tuổi tác, địa vị nhân vật để tạo đại từ phù hợp (Ta - Ngươi, Lão - Cháu, Mình - Cậu) thay thế dịch máy robot "Tôi - Bạn".
- **[Quy trình phát triển Component, Storybook & Testing](file:///Users/mn20/Projects/Test/docs/WORKFLOW.md)**: Hướng dẫn chi tiết về cấu trúc co-location, cách tạo Stories, tương tác test với Playwright Chromium và Vitest.

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
