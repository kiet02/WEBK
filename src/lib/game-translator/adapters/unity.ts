/**
 * Unity & Generic Localization Adapter
 * Handles XUnity.AutoTranslator key-value dictionaries, CSV/TSV, and generic JSON.
 */

import { TranslatableSegment } from '../types';
import { extractGameTags } from '../tag-guard';

/**
 * Extract segments from Key-Value text (XUnity / Configs)
 */
export function extractUnityKeyValueSegments(
  fileName: string,
  rawContent: string
): TranslatableSegment[] {
  const segments: TranslatableSegment[] = [];
  const lines = rawContent.split('\n');

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const original = line.substring(0, equalIndex).trim();
      const currentTranslation = line.substring(equalIndex + 1).trim();

      if (original.length > 0) {
        segments.push({
          id: `${fileName}:line_${lineIdx + 1}`,
          file: fileName,
          original,
          translation: currentTranslation !== original ? currentTranslation : '',
          context: `Unity Key-Value tại dòng ${lineIdx + 1}`,
          status: currentTranslation && currentTranslation !== original ? 'translated' : 'untranslated',
          tags: extractGameTags(original),
          meta: { lineIdx, originalKey: original },
        });
      }
    }
  });

  return segments;
}

/**
 * Re-inject translations into Unity Key-Value format
 */
export function injectUnityKeyValueTranslations(
  rawContent: string,
  segments: TranslatableSegment[]
): string {
  const transMap = new Map<number, string>();
  for (const s of segments) {
    if (s.translation.trim().length > 0 && typeof s.meta.lineIdx === 'number') {
      transMap.set(s.meta.lineIdx, s.translation);
    }
  }

  const lines = rawContent.split('\n');
  lines.forEach((line, lineIdx) => {
    const trans = transMap.get(lineIdx);
    if (!trans) return;

    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex);
      lines[lineIdx] = `${key}=${trans}`;
    }
  });

  return lines.join('\n');
}

/**
 * Extract segments from Generic JSON (Flat or nested key-value)
 */
export function extractGenericJsonSegments(
  fileName: string,
  rawJson: string
): TranslatableSegment[] {
  const segments: TranslatableSegment[] = [];

  let data: unknown;
  try {
    data = JSON.parse(rawJson) as unknown;
  } catch {
    return segments;
  }

  function traverse(obj: unknown, path: string[]) {
    if (typeof obj === 'string') {
      if (obj.trim().length > 0) {
        const pathStr = path.join('.');
        segments.push({
          id: `${fileName}:${pathStr}`,
          file: fileName,
          original: obj,
          translation: '',
          context: `JSON Path: ${pathStr}`,
          status: 'untranslated',
          tags: extractGameTags(obj),
          meta: { path },
        });
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        traverse(item, [...path, String(idx)]);
      });
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        traverse(value, [...path, key]);
      }
    }
  }

  traverse(data, []);
  return segments;
}

/**
 * Re-inject translations into Generic JSON
 */
export function injectGenericJsonTranslations(
  rawJson: string,
  segments: TranslatableSegment[]
): string {
  let data: unknown;
  try {
    data = JSON.parse(rawJson) as unknown;
  } catch {
    return rawJson;
  }

  const cloned = JSON.parse(JSON.stringify(data)) as unknown;
  const transMap = new Map<string, string>();
  for (const s of segments) {
    if (s.translation.trim().length > 0) {
      transMap.set(s.id, s.translation);
    }
  }

  segments.forEach((s) => {
    const trans = transMap.get(s.id);
    if (!trans) return;

    const path = s.meta.path as string[] | undefined;
    if (!path || path.length === 0) return;

    let curr: unknown = cloned;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof curr === 'object' && curr !== null) {
        curr = (curr as Record<string, unknown>)[path[i]];
      }
    }

    if (typeof curr === 'object' && curr !== null) {
      (curr as Record<string, unknown>)[path[path.length - 1]] = trans;
    }
  });

  return JSON.stringify(cloned, null, 2);
}
