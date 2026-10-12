'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/lottie';
import { LanguageToggle } from '@/components/ui/language';
import { useLanguage } from '@/hook';
import { GameTranslatorStudio } from '@/components/game-translator/GameTranslatorStudio';

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh font-sans flex flex-col justify-between transition-colors duration-200 text-(--theme-text) dark:bg-zinc-950 bg-zinc-50 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 text-lg">
              🎮
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-white">
                GameLingo AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                v1.0 • Engine Auto-Detect
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="default" dot size="sm">
              RPG Maker • Ren&apos;Py • Unity
            </Badge>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Game Translator Studio */}
      <main className="flex-1 w-full pb-16">
        <GameTranslatorStudio />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            {t('home.footerCopyright', '© 2026 GameLingo AI • Multi-Engine Game Localization Studio')}
          </div>
          <div className="flex items-center gap-4">
            <a
              href="docs/phases/phase-1-game-translation-platform.md"
              className="hover:text-indigo-500 transition-colors"
            >
              Tài liệu Kỹ thuật Phase 1
            </a>
            <span>•</span>
            <span className="font-mono text-[11px]">Safe Tag Shielding Activated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
