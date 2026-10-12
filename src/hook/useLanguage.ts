'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { translate, type SupportedLanguage, type TranslationKey } from '../lib/i18n';

export type { SupportedLanguage, TranslationKey };

const LANGUAGE_STORAGE_KEY = 'language_preference';
const LANGUAGE_CHANGE_EVENT = 'app-language-change';

function subscribeLanguage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

function getLanguageSnapshot(): SupportedLanguage {
  if (typeof window === 'undefined') return 'vi';
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') return stored;
    return 'vi';
  } catch {
    return 'vi';
  }
}

function getServerLanguageSnapshot(): SupportedLanguage {
  return 'vi';
}

/**
 * Global system hook quản lý và chuyển đổi ngôn ngữ ứng dụng với hệ thống từ điển i18n.
 * Sử dụng useSyncExternalStore (chuẩn React 18/19) để đồng bộ đa tab, tránh cascading renders và lỗi hydration.
 */
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  const setLanguage = useCallback((newLang: SupportedLanguage): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
        window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
      }
    } catch {
      // Bỏ qua lỗi storage
    }
  }, []);

  const toggleLanguage = useCallback((): void => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  }, [language, setLanguage]);

  /**
   * Hàm dịch i18n:
   * 1. Tra cứu theo key: t('common.welcome') hoặc t('checkout.title')
   * 2. Hoặc truyền 2 bản dịch trực tiếp: t('Xin chào quý khách', 'Welcome guest')
   */
  const t = useCallback(
    (first: TranslationKey | string, second?: unknown): string => {
      // 1. Kiểm tra tra cứu trong từ điển i18n
      const translated = translate(language, first as TranslationKey);
      if (translated !== first) {
        if (typeof second === 'object' && second !== null) {
          return translate(language, first as TranslationKey, second as Record<string, string | number>);
        }
        return translated;
      }

      // 2. Dạng truyền trực tiếp: t('Tiếng Việt', 'English')
      if (second !== undefined && typeof second === 'string') {
        return language === 'vi' ? first : second;
      }

      const params = typeof second === 'object' && second !== null ? (second as Record<string, string | number>) : undefined;
      return translate(language, first as TranslationKey, params);
    },
    [language]
  );

  return {
    language,
    isVietnamese: language === 'vi',
    isEnglish: language === 'en',
    setLanguage,
    toggleLanguage,
    t,
  };
}
