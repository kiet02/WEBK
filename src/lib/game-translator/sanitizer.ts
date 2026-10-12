/**
 * Game Text Sanitizer & Anti-Hallucination Guard
 * Prevents AI chatty explanations, fantasy hallucinations, and ensures tag preservation.
 */

import { OFFLINE_SENTENCE_CATALOG } from './catalog';

// Vietnamese diacritics matcher to detect if text is actually in Vietnamese
const VIETNAMESE_CHAR_REGEX =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

// CJK (Chinese, Japanese Kanji, Korean Hanja) characters regex
export const CJK_CHAR_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

// Patterns where LLMs act as a chatbot / dictionary explaining words
const EXPLANATION_PATTERNS = [
  /^(?:["'“”]?)([^"'\n]+?)(?:["'“”]?)\s+(?:là\s+(?:một\s+)?(?:hành động|khái niệm|thuật ngữ|tính năng|lựa chọn|từ ngữ|cụm từ)|có nghĩa là|được hiểu là|được định nghĩa là|dùng để|được sử dụng để|trong (?:trò chơi|game)\b)/i,
  /^(?:Dưới đây là|Bản dịch của|Ý nghĩa của|Câu này (?:có nghĩa|dịch) là|Dịch sang tiếng Việt:?|Nghĩa tiếng Việt:?)\s*/i,
  /^["'“”](.+)["'“”]$/,
];

export interface SanitizeResult {
  cleanedText: string;
  isHallucinated: boolean;
  explanationStripped: boolean;
  tagsRecovered: boolean;
  reason?: string;
}

/**
 * Checks if a translation is hallucinated or chatty, and repairs or rejects it
 */
export function sanitizeAndValidateTranslation(
  originalMasked: string,
  translatedRaw: string,
  tokens: { token: string; original: string }[],
  targetLang = 'vi'
): SanitizeResult {
  const origTrimmed = originalMasked.trim();
  let text = translatedRaw.trim();
  let explanationStripped = false;
  let isHallucinated = false;
  let tagsRecovered = false;
  let reason: string | undefined;

  // 1. Strip surrounding quotes if wrapped
  const quoteMatch = text.match(/^["'“”]([\s\S]+)["'“”]$/);
  if (quoteMatch && quoteMatch[1]) {
    text = quoteMatch[1].trim();
  }

  // 2. Strip chatbot prefixes (e.g. "Bản dịch: ...")
  const prefixMatch = text.match(
    /^(?:Bản dịch(?: của câu này)?|Dịch là|Nghĩa là|Dịch sang tiếng Việt|Kết quả dịch)[:\s-]+\s*(.*)$/i
  );
  if (prefixMatch && prefixMatch[1]) {
    text = prefixMatch[1].trim();
    explanationStripped = true;
  }

  // 3. Detect Chatty Definition Explanations
  // e.g. '"Accept Quest" là một hành động quan trọng trong quá trình chơi game...'
  for (const pat of EXPLANATION_PATTERNS) {
    if (pat.test(text)) {
      isHallucinated = true;
      reason = 'Phát hiện câu giải thích định nghĩa thay vì dịch thuật.';
      break;
    }
  }

  // 4. Detect Over-generation / Story Hallucination
  // If original is short (< 35 chars) e.g. "Accept Quest" or "Starting Town", but translation exploded > 3x & > 60 chars
  if (origTrimmed.length <= 35 && text.length > 70) {
    isHallucinated = true;
    reason = `Độ dài bất thường (${text.length} ký tự so với gốc ${origTrimmed.length} ký tự).`;
  }

  // 5. Detect Inverted / Untranslated English Story Hallucination when target is 'vi'
  if (targetLang === 'vi' && text.length > 60) {
    const hasVietnamese = VIETNAMESE_CHAR_REGEX.test(text);
    if (!hasVietnamese) {
      isHallucinated = true;
      reason = 'Văn bản dài nhưng không chứa ký tự tiếng Việt (ảo giác tiếng Anh).';
    }
  }

  // 5b. Detect Chinese / CJK Language Slip when target is 'vi'
  if (targetLang === 'vi' && CJK_CHAR_REGEX.test(text)) {
    isHallucinated = true;
    reason = 'Phát hiện ký tự chữ Hán / tiếng Trung do mô hình AI bị nhầm ngôn ngữ.';
  }

  // 6. Check for Tag Preservation
  // Ensure every ⟦TAG_i⟧ that was in originalMasked is present in text
  for (const { token } of tokens) {
    if (originalMasked.includes(token) && !text.includes(token)) {
      // Token was dropped by AI! Re-append it to text
      tagsRecovered = true;
      text = `${text} ${token}`;
    }
  }

  // 7. If severely hallucinated, fallback to clean offline sentence catalog if available
  if (isHallucinated) {
    const catalogMatch = OFFLINE_SENTENCE_CATALOG[origTrimmed];
    if (catalogMatch) {
      return {
        cleanedText: catalogMatch,
        isHallucinated: false,
        explanationStripped: true,
        tagsRecovered: true,
        reason: reason
          ? `${reason} (Đã tự động thay thế bằng bản dịch game chuẩn từ thư viện)`
          : 'Đã tự động thay thế bằng bản dịch game chuẩn từ thư viện.',
      };
    }
  }

  return {
    cleanedText: text,
    isHallucinated,
    explanationStripped,
    tagsRecovered,
    reason,
  };
}
