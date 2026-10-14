'use client';

import React from 'react';
import { SpeakerPersona } from '@/lib/game-translator/types';
import { tokenizePronouns } from '@/lib/game-translator/speaker-analyzer';

export interface PronounHighlightedTextProps {
  text: string;
  persona?: SpeakerPersona;
  className?: string;
}

export function PronounHighlightedText({
  text,
  persona,
  className = '',
}: PronounHighlightedTextProps): React.JSX.Element {
  if (!text || text.trim().length === 0) {
    return <span className="text-zinc-400 italic text-xs">Chưa có bản dịch</span>;
  }

  const tokens = tokenizePronouns(text, persona);

  return (
    <span className={`leading-relaxed break-words ${className}`}>
      {tokens.map((token, idx) => {
        if (!token.isPronoun) {
          return <span key={idx}>{token.text}</span>;
        }

        if (token.type === 'first_person') {
          return (
            <mark
              key={idx}
              title={token.label}
              className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.2 rounded font-bold text-[inherit] bg-violet-100 text-violet-900 dark:bg-violet-950/90 dark:text-violet-200 border border-violet-300 dark:border-violet-700 select-all cursor-help"
            >
              <span>{token.text}</span>
            </mark>
          );
        }

        if (token.type === 'second_person') {
          return (
            <mark
              key={idx}
              title={token.label}
              className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.2 rounded font-bold text-[inherit] bg-cyan-100 text-cyan-900 dark:bg-cyan-950/90 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700 select-all cursor-help"
            >
              <span>{token.text}</span>
            </mark>
          );
        }

        if (token.type === 'mismatched_pronoun') {
          return (
            <mark
              key={idx}
              title={token.label}
              className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.2 rounded font-bold text-[inherit] bg-rose-100 text-rose-900 dark:bg-rose-950/90 dark:text-rose-200 border border-rose-400 dark:border-rose-700 select-all cursor-help ring-1 ring-rose-400/40"
            >
              <span>{token.text}</span>
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400" aria-hidden="true">
                ⚠️
              </span>
            </mark>
          );
        }

        return (
          <mark
            key={idx}
            title={token.label}
            className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.2 rounded font-bold text-[inherit] bg-emerald-100 text-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 select-all cursor-help"
          >
            <span>{token.text}</span>
          </mark>
        );
      })}
    </span>
  );
}
