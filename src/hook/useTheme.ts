'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';

export type ThemeId =
  | 'light'
  | 'dark'
  | 'zinc'
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber';

export interface ThemeColors {
  bg: string;
  textColor: string;
  border: string;
  card: string;
  primary: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  icon?: string;
  colors: ThemeColors;
}

export const THEMES: readonly ThemeOption[] = [
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    colors: {
      bg: '#ffffff',
      textColor: '#09090b',
      border: '#e4e4e7',
      card: '#ffffff',
      primary: '#18181b',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      bg: '#09090b',
      textColor: '#fafafa',
      border: '#27272a',
      card: '#18181b',
      primary: '#fafafa',
    },
  },
  {
    id: 'zinc',
    name: 'Zinc',
    colors: {
      bg: '#f4f4f5',
      textColor: '#18181b',
      border: '#d4d4d8',
      card: '#ffffff',
      primary: '#71717a',
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    colors: {
      bg: '#f0f7ff',
      textColor: '#0f172a',
      border: '#bfdbfe',
      card: '#ffffff',
      primary: '#2563eb',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      bg: '#eef2ff',
      textColor: '#1e1b4b',
      border: '#c7d2fe',
      card: '#ffffff',
      primary: '#6366f1',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      bg: '#ecfdf5',
      textColor: '#064e3b',
      border: '#a7f3d0',
      card: '#ffffff',
      primary: '#059669',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    colors: {
      bg: '#f5f3ff',
      textColor: '#2e1065',
      border: '#ddd6fe',
      card: '#ffffff',
      primary: '#7c3aed',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      bg: '#fff1f2',
      textColor: '#4c0519',
      border: '#fecdd3',
      card: '#ffffff',
      primary: '#e11d48',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      bg: '#fffbeb',
      textColor: '#451a03',
      border: '#fde68a',
      card: '#ffffff',
      primary: '#d97706',
    },
  },
];

// State tập trung: đơn giản, nhẹ, đồng bộ mọi component
let currentTheme: ThemeId = 'light';
const listeners = new Set<() => void>();

function syncDOM() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = currentTheme === 'dark';
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', currentTheme);

  const active = THEMES.find((t) => t.id === currentTheme) ?? THEMES[0];
  root.style.setProperty('--theme-bg', active.colors.bg);
  root.style.setProperty('--theme-text', active.colors.textColor);
  root.style.setProperty('--theme-border', active.colors.border);
  root.style.setProperty('--theme-card', active.colors.card);
  root.style.setProperty('--theme-primary', active.colors.primary);

  // Đồng bộ cả biến --background và --foreground của Tailwind
  root.style.setProperty('--background', active.colors.bg);
  root.style.setProperty('--foreground', active.colors.textColor);
  if (document.body) {
    document.body.style.backgroundColor = active.colors.bg;
    document.body.style.color = active.colors.textColor;
  }
}

function notify() {
  syncDOM();
  listeners.forEach((listener) => listener());
}

/**
 * Hook quản lý theme hệ thống:
 * Danh sách theme tích hợp với danh mục màu (bg, textColor, border, card, primary)
 */
export function useTheme() {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, []);

  const theme = useSyncExternalStore(subscribe, () => currentTheme, () => 'light' as ThemeId);

  useEffect(() => {
    const saved = localStorage.getItem('app_theme') as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      currentTheme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark';
    }
    notify();
  }, []);

  const setTheme = useCallback((newTheme: ThemeId) => {
    currentTheme = newTheme;
    try {
      localStorage.setItem('app_theme', newTheme);
    } catch {
      // Bỏ qua lỗi storage
    }
    notify();
  }, []);

  const activeTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return {
    theme,
    setTheme,
    themes: THEMES,
    activeTheme,
    colors: activeTheme.colors,
    isDark: theme === 'dark',
    // Tiện ích tương thích ngược
    mode: theme === 'dark' ? 'dark' : 'light',
    toggleMode: () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'),
  };
}

export const THEME_COLORS = THEMES;
