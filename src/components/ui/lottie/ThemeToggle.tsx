'use client';

import React, { useRef } from 'react';
import { Lottie, type LottieHandle } from 'lottie-react';
import { useTheme } from '@/hook';

export interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export function ThemeToggle({
  className = 'w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-1.5 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-95 cursor-pointer shadow-sm',
  style,
  'aria-label': ariaLabel = 'Change theme',
}: ThemeToggleProps) {
  const { theme, toggleMode } = useTheme();
  const handle = useRef<LottieHandle>(null);

  const handleClick = () => {
    // Luôn luôn áp dụng thay đổi theme ngay lập tức
    toggleMode();
    handle.current?.play();
  };

  return (
    <Lottie
      as="button"
      src="/Light-dark mode button.json"
      lottieRef={handle}
      segment={[60, 100]}
      direction={theme === 'dark' ? 'reverse' : 'forward'}
      onClick={handleClick}
      role="switch"
      aria-checked={theme === 'dark'}
      type="button"
      aria-label={ariaLabel}
      className={`shrink-0 overflow-hidden [&_svg]:w-full! [&_svg]:h-full! [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:block ${className}`}
      style={{ width: '2.25rem', height: '2.25rem', ...style }}
    />
  );
}
