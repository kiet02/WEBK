'use client';

import { useEffect } from 'react';

export interface ShortcutOptions {
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

/**
 * Global system hook lắng nghe phím tắt toàn cục (ví dụ: Esc đóng modal, Cmd+K / Ctrl+K mở tìm kiếm).
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {}
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrlOrMeta = options.ctrlOrMeta ? event.ctrlKey || event.metaKey : true;
      const matchesShift = options.shift !== undefined ? event.shiftKey === options.shift : true;
      const matchesAlt = options.alt !== undefined ? event.altKey === options.alt : true;

      if (matchesKey && matchesCtrlOrMeta && matchesShift && matchesAlt) {
        if (options.preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options]);
}
