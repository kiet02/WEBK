'use client';

import { useCallback, useSyncExternalStore, useMemo } from 'react';

/**
 * Global system hook quản lý trạng thái lưu trữ localStorage với đồng bộ đa tab (cross-tab sync).
 * Sử dụng useSyncExternalStore (chuẩn React 18/19), không dùng setState trong effect, đảm bảo an toàn SSR.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const customEventName = `app-storage-${key}`;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) {
          callback();
        }
      };
      window.addEventListener('storage', handleStorage);
      window.addEventListener(customEventName, callback);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(customEventName, callback);
      };
    },
    [key, customEventName]
  );

  const getSnapshot = useCallback((): string => {
    if (typeof window === 'undefined') return JSON.stringify(initialValue);
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? item : JSON.stringify(initialValue);
    } catch {
      return JSON.stringify(initialValue);
    }
  }, [key, initialValue]);

  const getServerSnapshot = useCallback((): string => {
    return JSON.stringify(initialValue);
  }, [initialValue]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<T>(() => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  }, [raw, initialValue]);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)): void => {
      try {
        if (typeof window !== 'undefined') {
          const currentRaw = window.localStorage.getItem(key);
          const currentVal: T = currentRaw !== null ? (JSON.parse(currentRaw) as T) : initialValue;
          const nextVal = updater instanceof Function ? updater(currentVal) : updater;
          window.localStorage.setItem(key, JSON.stringify(nextVal));
          window.dispatchEvent(new Event(customEventName));
        }
      } catch {
        // Bỏ qua lỗi quota
      }
    },
    [key, initialValue, customEventName]
  );

  return [value, setValue];
}
