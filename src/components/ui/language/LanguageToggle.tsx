'use client';

import React from 'react';
import { useLanguage } from '@/hook';

export interface LanguageToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

export function LanguageToggle({
  className = 'h-9 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 font-bold text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0',
  style,
}: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      id="btn-toggle-language"
      onClick={toggleLanguage}
      className={className}
      style={style}
      aria-label="Change language"
      title={language === 'vi' ? 'Chuyển sang Tiếng Anh (English)' : 'Switch to Vietnamese (Tiếng Việt)'}
    >
      <span className="text-sm">🌐</span>
      <span className="font-mono text-[11px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
        {language === 'vi' ? 'VI' : 'EN'}
      </span>
    </button>
  );
}
