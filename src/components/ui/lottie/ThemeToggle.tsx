'use client';

import React, { useRef } from 'react';
import { Lottie, type LottieHandle } from 'lottie-react';
import { useTheme } from '@/hook';

export interface ThemeToggleProps {
  className?: string;
  'aria-label'?: string;
}

export function ThemeToggle({
  className = ' w-9 h-9 flex items-center justify-center rounded-lg border p-1 transition-colors hover:opacity-80',
  'aria-label': ariaLabel = 'Change theme',
}: ThemeToggleProps) {
  const { theme, toggleMode } = useTheme();
  const handle = useRef<LottieHandle>(null);

  return (
    <Lottie
      as="button"
      src="/Light-dark mode button.json"
      lottieRef={handle}
      segment={[60, 100]}
      direction={theme === 'dark' ? 'reverse' : 'forward'}
      onClick={() => {
        handle.current?.play();
      }}
      role="switch"
      aria-checked={theme === 'dark'}
      subscriptions={{
        complete: () => {
          toggleMode();
        },
      }}
      type='button'
      aria-label={ariaLabel}
      className={className}
    />
  );
}
