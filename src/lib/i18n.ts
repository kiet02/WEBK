/**
 * Hệ thống từ điển i18n song ngữ (Tiếng Việt & Tiếng Anh)
 * Hỗ trợ tra cứu theo cấu trúc phân cấp (dot-notation key) và thay thế tham số.
 */
export const translations = {
  vi: {
    common: {
      welcome: 'Xin chào',
      language: 'Ngôn ngữ',
      theme: 'Giao diện',
      colorPalette: 'Bảng màu chủ đạo',
      apply: 'Áp dụng',
      loading: 'Đang xử lý...',
      success: 'Thành công',
      error: 'Đã xảy ra lỗi',
      light: 'Sáng',
      dark: 'Tối',
      system: 'Hệ thống',
    },
    home: {
      badge: 'Sẵn Sàng Cho Dự Án Mới',
      title: 'Khởi Tạo Ứng Dụng Mới',
      subtitle: 'Môi trường phát triển sạch với Next.js 16, Tailwind CSS, hệ thống đa ngôn ngữ & theme, kèm bộ UI Components và kho Skills hoàn chỉnh.',
      getStarted: 'Bắt đầu phát triển',
      docsButton: 'Tài liệu hướng dẫn',
      featuresTitle: 'Nền tảng sẵn có',
      feature1Title: 'Tailwind CSS & Dark Mode',
      feature1Desc: 'Thiết lập chuẩn theme sáng/tối tự động lưu vào LocalStorage và hỗ trợ mượt mà qua hook useTheme.',
      feature2Title: 'Hệ thống i18n Song Ngữ',
      feature2Desc: 'Cơ chế tra cứu bản dịch type-safe không runtime overhead với chuyển đổi ngôn ngữ tức thì.',
      feature3Title: 'Kho Agent Skills Đầy Đủ',
      feature3Desc: 'Bảo lưu trọn vẹn toàn bộ skills trong .agents/ phục vụ thiết kế UI, tối ưu hoá và kiểm thử.',
      footerCopyright: '© 2026 GameLingo AI • Multi-Engine Game Localization Studio',
    },
    gameTranslator: {
      title: 'GameLingo AI Studio',
      subtitle: 'Nhận diện tự động RPG Maker, Ren\'Py, Unity & Frameworks khác. Dịch thuật AI bảo toàn 100% biến game.',
      loadDemo: 'Thử Ngay Mẫu Demo',
      dropzoneTitle: 'Kéo thả tệp hoặc thư mục game vào đây',
      dropzoneDesc: 'Hỗ trợ .json (RPG Maker MV/MZ), .rpy (Ren\'Py), .txt/.csv (Unity Key-Value), hoặc tải cả thư mục game',
      selectFolder: 'Chọn Thư Mục Game',
      selectFiles: 'Chọn Tệp Riêng Lẻ',
      detectedEngine: 'Engine Được Nhận Diện',
      confidence: 'Độ tin cậy',
      segmentsCount: 'Tổng số câu',
      translatedCount: 'Đã dịch',
      aiBatchTranslate: 'Dịch Hàng Loạt Bằng AI',
      exportZip: 'Tải Gói Bản Vá (.ZIP)',
      exportFiles: 'Xuất Tệp Đã Dịch',
      glossary: 'Bảng Thuật Ngữ',
      aiSettings: 'Cài Đặt AI',
      searchPlaceholder: 'Tìm kiếm chuỗi thoại gốc hoặc bản dịch...',
      allStatus: 'Tất cả',
      untranslated: 'Chưa dịch',
      translated: 'Đã dịch',
      reviewed: 'Đã duyệt',
      safeTagNotice: 'Các biến và mã điều khiển được bảo vệ an toàn',
    },
  },
  en: {
    common: {
      welcome: 'Welcome',
      language: 'Language',
      theme: 'Theme',
      colorPalette: 'Color Palette',
      apply: 'Apply',
      loading: 'Loading...',
      success: 'Success',
      error: 'An error occurred',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    home: {
      badge: 'Ready for New Project',
      title: 'Clean Starter Application',
      subtitle: 'A clean development environment with Next.js 16, Tailwind CSS, multi-language & theme support, accessible UI Components, and complete Skills intact.',
      getStarted: 'Get Started',
      docsButton: 'Documentation',
      featuresTitle: 'Built-in Features',
      feature1Title: 'Tailwind CSS & Dark Mode',
      feature1Desc: 'Dark/light theme setup with automatic LocalStorage persistence and smooth transition via useTheme hook.',
      feature2Title: 'Bilingual i18n System',
      feature2Desc: 'Type-safe dot-notation translation lookup without runtime overhead and instant language toggle.',
      feature3Title: 'Complete Agent Skills Preserved',
      feature3Desc: 'Fully retained skills directory in .agents/ ready for UI design, code optimization, and testing.',
      footerCopyright: '© 2026 GameLingo AI • Multi-Engine Game Localization Studio',
    },
    gameTranslator: {
      title: 'GameLingo AI Studio',
      subtitle: 'Auto-detect RPG Maker, Ren\'Py, Unity & other frameworks. AI localization with 100% game tag preservation.',
      loadDemo: 'Load Demo Project',
      dropzoneTitle: 'Drag & drop game files or folder here',
      dropzoneDesc: 'Supports .json (RPG Maker MV/MZ), .rpy (Ren\'Py), .txt/.csv (Unity Key-Value), or folder tree upload',
      selectFolder: 'Select Game Folder',
      selectFiles: 'Select Game Files',
      detectedEngine: 'Detected Engine',
      confidence: 'Confidence',
      segmentsCount: 'Total Strings',
      translatedCount: 'Translated',
      aiBatchTranslate: 'AI Batch Translate',
      exportZip: 'Export Game Patch (.ZIP)',
      exportFiles: 'Export Files',
      glossary: 'Glossary Manager',
      aiSettings: 'AI Settings',
      searchPlaceholder: 'Search original or translated dialogue...',
      allStatus: 'All',
      untranslated: 'Untranslated',
      translated: 'Translated',
      reviewed: 'Reviewed',
      safeTagNotice: 'All game variables and control escape codes are safely shielded',
    },
  },
} as const;

export type SupportedLanguage = keyof typeof translations;

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
  ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
  : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations['vi']>;

/**
 * Tra cứu bản dịch an toàn theo dot-notation key (vd: 'home.title', 'common.welcome')
 */
export function translate(
  lang: SupportedLanguage,
  key: TranslationKey | (string & Record<never, never>),
  params?: Record<string, string | number>
): string {
  const segments = key.split('.');
  const dictionary: Record<string, unknown> = translations[lang] || translations.vi;
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      // Fallback sang từ điển Tiếng Việt nếu thiếu
      const fallbackDict: Record<string, unknown> = translations.vi;
      let fallbackCurrent: unknown = fallbackDict;
      for (const fbSegment of segments) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fbSegment in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fbSegment];
        } else {
          return key;
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let result = current;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return result;
}
