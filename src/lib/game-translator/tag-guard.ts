/**
 * Tag Guard & Masker for Game Engines
 * Protects variables, color codes, and control escape characters from AI alteration.
 */

// Comprehensive regex patterns for game engines
const ENGINE_TAG_PATTERNS = [
  // RPG Maker control codes: \V[1], \N[1], \C[2], \I[45], \., \|, \!, \^, \{, \}, \FS[24]
  /\\[vVnNcCpPgGwWiI]\[\d+\]/g,
  /\\[fF][sS]\[\d+\]/g,
  /\\[.|\^!><{}]/g,

  // Ren'Py text tags: {i}, {/i}, {b}, {/b}, {color=#fff}, {size=24}, {w=1.0}, etc.
  /\{[a-zA-Z0-9_#=/.]+\}/g,
  // Ren'Py variable interpolation: [player_name], [hero.hp] (must start with letter or underscore)
  /\[[a-zA-Z_][a-zA-Z0-9_.]*\]/g,

  // TextMeshPro / Unity Rich Text: <color=#...>, </color>, <size=...>, </size>, <b>, </b>
  /<\/?[a-zA-Z0-9_#=.]+>/g,

  // Format placeholders: {0}, {1}, {name}, %s, %d, %1$s
  /\{[0-9a-zA-Z_]+\}/g,
  /%(?:[0-9]+\$)?[0-9]*\.?[0-9]*[a-zA-Z]/g,
];

export interface TagMatch {
  index: number;
  length: number;
  value: string;
}

export interface MaskResult {
  maskedText: string;
  tokens: { token: string; original: string }[];
}

/**
 * Finds all tags and removes substring overlaps (e.g. \V[1] should not also emit [1])
 */
export function getNonOverlappingMatches(text: string): TagMatch[] {
  const matches: TagMatch[] = [];

  for (const pattern of ENGINE_TAG_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        value: match[0],
      });
    }
  }

  // Sort by start index ascending; if same start, longer match first
  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.length - a.length;
  });

  const nonOverlapping: TagMatch[] = [];
  let lastEnd = -1;

  for (const m of matches) {
    if (m.index >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.index + m.length;
    }
  }

  return nonOverlapping;
}

/**
 * Scan text and return unique detected game tags (filtered for overlaps)
 */
export function extractGameTags(text: string): string[] {
  const matches = getNonOverlappingMatches(text);
  const found = new Set<string>();
  for (const m of matches) {
    found.add(m.value);
  }
  return Array.from(found);
}

/**
 * Replace all game engine tags with shielded tokens like ⟦TAG_0⟧
 */
export function maskGameTags(text: string): MaskResult {
  const nonOverlapping = getNonOverlappingMatches(text);
  const tokens: { token: string; original: string }[] = [];
  let tokenCounter = 0;
  let maskedText = text;

  // Apply masking from end to start so indices stay accurate
  for (let i = nonOverlapping.length - 1; i >= 0; i--) {
    const item = nonOverlapping[i];
    const token = `⟦TAG_${tokenCounter}⟧`;
    tokens.unshift({ token, original: item.value });
    maskedText =
      maskedText.substring(0, item.index) +
      token +
      maskedText.substring(item.index + item.length);
    tokenCounter++;
  }

  return { maskedText, tokens };
}

/**
 * Restore shielded tokens back to their original game engine escape sequences
 */
export function unmaskGameTags(
  text: string,
  tokens: { token: string; original: string }[]
): string {
  let restored = text;

  for (const { token, original } of tokens) {
    // Escape brackets for literal token replacement
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    restored = restored.replace(new RegExp(escapedToken, 'g'), original);

    // Also handle possible AI variations (e.g. AI dropped brackets or changed to [TAG_0] or 【TAG_0】)
    const numericIndex = token.match(/\d+/)?.[0];
    if (numericIndex) {
      const looseRegex = new RegExp(
        `(?:\\[|【|\\{|⟦)?TAG_${numericIndex}(?:\\]|】|\\}|⟧)?`,
        'g'
      );
      restored = restored.replace(looseRegex, original);
    }
  }

  return restored;
}
