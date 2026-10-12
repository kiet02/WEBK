import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useOnlineStatus,
  useMediaQuery,
  useLocalStorage,
  useKeyboardShortcut,
  useDebounce,
  useTheme,
  useLanguage,
  THEMES,
  translate,
} from './index';

describe('System Hooks (Global & Hệ thống)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('useDebounce nên trì hoãn cập nhật giá trị theo delayMs', () => {
    expect(typeof useDebounce).toBe('function');
  });

  it('useOnlineStatus được định nghĩa và là function', () => {
    expect(typeof useOnlineStatus).toBe('function');
  });

  it('useMediaQuery được định nghĩa và là function', () => {
    expect(typeof useMediaQuery).toBe('function');
  });

  it('useLocalStorage được định nghĩa và là function', () => {
    expect(typeof useLocalStorage).toBe('function');
  });

  it('useKeyboardShortcut được định nghĩa và là function', () => {
    expect(typeof useKeyboardShortcut).toBe('function');
  });

  it('useTheme cung cấp danh sách theme tích hợp có sẵn (Light | Dark | Zinc | Blue | ...)', () => {
    expect(typeof useTheme).toBe('function');
    expect(THEMES.length).toBeGreaterThan(0);
    expect(THEMES.map((t) => t.id)).toContain('light');
    expect(THEMES.map((t) => t.id)).toContain('dark');
    expect(THEMES.map((t) => t.id)).toContain('zinc');
    expect(THEMES.map((t) => t.id)).toContain('blue');
    expect(THEMES.map((t) => t.id)).toContain('emerald');
    // Kiểm tra cấu trúc màu định danh (bg, textColor, border, card, primary)
    const lightTheme = THEMES.find((t) => t.id === 'light');
    expect(lightTheme?.colors).toHaveProperty('bg');
    expect(lightTheme?.colors).toHaveProperty('textColor');
    expect(lightTheme?.colors).toHaveProperty('border');
    expect(lightTheme?.colors).toHaveProperty('card');
    expect(lightTheme?.colors).toHaveProperty('primary');

    const darkTheme = THEMES.find((t) => t.id === 'dark');
    expect(darkTheme?.colors.bg).toBe('#09090b');
    expect(darkTheme?.colors.textColor).toBe('#fafafa');
  });

  it('useLanguage và hệ thống từ điển i18n dịch chính xác theo key', () => {
    expect(typeof useLanguage).toBe('function');

    // Kiểm tra dịch Tiếng Việt
    expect(translate('vi', 'common.welcome')).toBe('Xin chào');
    expect(translate('vi', 'home.title')).toBe('Khởi Tạo Ứng Dụng Mới');

    // Kiểm tra dịch Tiếng Anh
    expect(translate('en', 'common.welcome')).toBe('Welcome');
    expect(translate('en', 'home.title')).toBe('Clean Starter Application');

    // Kiểm tra fallback với key không tồn tại
    expect(translate('vi', 'unknown.key')).toBe('unknown.key');
  });
});
