'use client';

import { useState, useEffect } from 'react';

/**
 * Global system hook trì hoãn cập nhật giá trị (debounce) cho tìm kiếm, resize, filter,...
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
