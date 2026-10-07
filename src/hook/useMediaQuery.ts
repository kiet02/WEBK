'use client';

import { useSyncExternalStore } from 'react';

/**
 * Global system hook lắng nghe CSS media query (responsive breakpoint, dark mode hệ thống,...).
 * SSR-safe thông qua useSyncExternalStore.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    const matchMedia = window.matchMedia(query);
    matchMedia.addEventListener('change', callback);
    return () => matchMedia.removeEventListener('change', callback);
  };

  const getSnapshot = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = (): boolean => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
