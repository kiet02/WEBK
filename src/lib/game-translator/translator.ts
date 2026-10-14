/**
 * AI Game Translation Service
 * Context-aware batch translation with tag shielding and glossary enforcement.
 */

import { AIServiceConfig, GlossaryItem, TranslatableSegment } from './types';
import { maskGameTags, unmaskGameTags } from './tag-guard';
import { translateSingleWithWebGPU } from './webgpu-translator';
import { translateWithPythonEngine } from './python-bridge';
import { OFFLINE_SENTENCE_CATALOG } from './catalog';
import { sanitizeAndValidateTranslation } from './sanitizer';
import {
  autoFixPronouns,
  buildSpeakerPronounPrompt,
  formatSpeakerDialogueGuideline,
} from './speaker-analyzer';

const TONE_INSTRUCTIONS: Record<string, string> = {
  fantasy_rpg:
    'Văn phong game nhập vai huyền ảo (Fantasy RPG): Trang trọng vừa phải, hào hùng, xưng hô hiệp sĩ/pháp sư phù hợp bối cảnh ma thuật.',
  visual_novel:
    'Văn phong Visual Novel (Nhật Bản/Anime): Tự nhiên, tình cảm, xưng hô linh hoạt theo ngữ cảnh nhân vật (tôi/cậu, anh/em, v.v.).',
  game_casual:
    'Văn phong game đại chúng hiện đại: Ngắn gọn, súc tích, dễ hiểu cho giao diện và nút bấm.',
  wuxia:
    'Văn phong Tiên hiệp / Kiếm hiệp: Dùng từ Hán Việt chuẩn xác, xưng hô huynh đệ, tại hạ, các hạ, chưởng môn.',
  sci_fi:
    'Văn phong Khoa học viễn tưởng (Sci-Fi): Thuật ngữ công nghệ, không gian, quân sự chuẩn mực.',
};

/**
 * Safely applies glossary terms using word boundary matching to prevent replacing inside tags
 */
export function applySafeGlossary(text: string, glossary: GlossaryItem[]): string {
  let result = text;
  for (const item of glossary) {
    if (item.term && item.translation) {
      const escaped = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'gi');
      result = result.replace(reg, item.translation);
    }
  }
  return result;
}

/**
 * Free web-based translation engine (Google Translate GTX)
 * Requires no API key and translates full sentences cleanly.
 */
export async function translateViaWebFree(
  text: string,
  targetLang: string
): Promise<string> {
  const catalogMatch = OFFLINE_SENTENCE_CATALOG[text.trim()];
  if (catalogMatch) {
    return catalogMatch;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Web translate failed: ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const combined = (data[0] as unknown[])
        .map((chunk) => {
          if (Array.isArray(chunk) && typeof chunk[0] === 'string') {
            return chunk[0];
          }
          return '';
        })
        .join('');

      if (combined.trim().length > 0) {
        return combined;
      }
    }
  } catch (err) {
    console.warn('Web translation API unavailable, using offline catalog fallback:', err);
  }

  // Fallback to offline catalog or clean placeholder
  return OFFLINE_SENTENCE_CATALOG[text.trim()] || text;
}

/**
 * Translate a batch of translatable segments using selected provider
 */
export async function translateSegmentsBatch(
  segments: TranslatableSegment[],
  config: AIServiceConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<TranslatableSegment[]> {
  const updatedSegments = [...segments];
  const BATCH_SIZE = 6;
  const total = segments.length;
  let completed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = updatedSegments.slice(i, i + BATCH_SIZE);

    // 1. Mask tags for every segment in batch
    const maskedItems = chunk.map((seg) => {
      const { maskedText, tokens } = maskGameTags(seg.original);
      return { seg, maskedText, tokens };
    });

    // 2. Perform translation
    if (config.provider === 'python_local') {
      try {
        const payload = maskedItems.map((m) => ({ id: m.seg.id, text: m.maskedText }));
        const resMap = await translateWithPythonEngine(payload, {
          targetLang: config.targetLang,
          glossary: config.glossary,
          url: config.endpoint,
        });

        maskedItems.forEach(({ seg, tokens, maskedText }) => {
          let trans = resMap.get(seg.id) || maskedText;
          const sanitized = sanitizeAndValidateTranslation(
            maskedText,
            trans,
            tokens,
            config.targetLang
          );
          trans = sanitized.cleanedText;
          trans = applySafeGlossary(trans, config.glossary);
          seg.translation = unmaskGameTags(trans, tokens);
          seg.status = 'translated';
        });
      } catch (err) {
        console.warn('Python accelerator unavailable, fallback to web translation:', err);
        await Promise.all(
          maskedItems.map(async ({ seg, maskedText, tokens }) => {
            let translatedMasked = await translateViaWebFree(maskedText, config.targetLang);
            const sanitized = sanitizeAndValidateTranslation(
              maskedText,
              translatedMasked,
              tokens,
              config.targetLang
            );
            translatedMasked = sanitized.cleanedText;
            translatedMasked = applySafeGlossary(translatedMasked, config.glossary);
            seg.translation = unmaskGameTags(translatedMasked, tokens);
            seg.status = 'translated';
          })
        );
      }
    } else if (config.provider === 'webgpu') {
      const toneInstruction = TONE_INSTRUCTIONS[config.tone] || '';
      for (const { seg, maskedText, tokens } of maskedItems) {
        const speakerGuideline = formatSpeakerDialogueGuideline(seg.speaker, config.personas);
        let translatedMasked: string;
        try {
          translatedMasked = await translateSingleWithWebGPU(maskedText, {
            modelId: config.model,
            targetLang: config.targetLang,
            toneInstruction,
            glossary: config.glossary,
            speakerGuideline,
          });
        } catch (err) {
          console.warn('WebGPU error, fallback to web translation:', err);
          translatedMasked = await translateViaWebFree(maskedText, config.targetLang);
        }

        const sanitized = sanitizeAndValidateTranslation(
          maskedText,
          translatedMasked,
          tokens,
          config.targetLang
        );
        translatedMasked = sanitized.isHallucinated
          ? await translateViaWebFree(maskedText, config.targetLang)
          : sanitized.cleanedText;

        translatedMasked = applySafeGlossary(translatedMasked, config.glossary);
        seg.translation = unmaskGameTags(translatedMasked, tokens);
        seg.status = 'translated';
      }
    } else if (config.provider === 'web_free' || config.provider === 'mock' || !config.apiKey) {
      await Promise.all(
        maskedItems.map(async ({ seg, maskedText, tokens }) => {
          let translatedMasked = await translateViaWebFree(maskedText, config.targetLang);
          const sanitized = sanitizeAndValidateTranslation(
            maskedText,
            translatedMasked,
            tokens,
            config.targetLang
          );
          translatedMasked = sanitized.cleanedText;
          translatedMasked = applySafeGlossary(translatedMasked, config.glossary);
          seg.translation = unmaskGameTags(translatedMasked, tokens);
          seg.status = 'translated';
        })
      );
    } else if (config.provider === 'gemini') {
      try {
        const apiKey = config.apiKey;
        const model = config.model || 'gemini-1.5-flash';
        const toneInstruction = TONE_INSTRUCTIONS[config.tone] || '';
        const glossaryPrompt =
          config.glossary.length > 0
            ? `BẢNG THUẬT NGỮ BẮT BUỘC:\n` +
              config.glossary.map((g) => `- "${g.term}" => "${g.translation}"`).join('\n')
            : '';
        const pronounPrompt = buildSpeakerPronounPrompt(config.personas || []);

        const systemPrompt = `Bạn là chuyên gia dịch thuật và bản địa hóa game chuyên nghiệp sang ${config.targetLang}.
YÊU CẦU BẮT BUỘC:
1. DỊCH TOÀN BỘ 100% CÂU CHỮ sang tiếng Việt tự nhiên, chuẩn phong cách game. TUYỆT ĐỐI KHÔNG để sót bất kỳ từ tiếng Anh nào (không được dịch nửa nạc nửa mỡ).
2. BẢO VỆ NGUYÊN VẸN CÁC THẺ: Tuyệt đối KHÔNG ĐƯỢC XÓA, SỬA HOẶC DỊCH các thẻ bảo vệ dạng ⟦TAG_0⟧, ⟦TAG_1⟧. Hãy đặt chúng vào đúng vị trí ngữ pháp trong câu dịch tiếng Việt.
3. CẤM GIẢI THÍCH: Tuyệt đối cấm giải thích ý nghĩa, định nghĩa từ, hoặc bịa thêm cốt truyện. Với các nút bấm/lựa chọn ngắn ("Accept Quest", "Decline"), chỉ dịch từ ngữ ngắn tương đương ("Nhận Nhiệm Vụ", "Từ Chối").
4. ${toneInstruction}
5. ${glossaryPrompt}
6. ${pronounPrompt}
7. Trả về ĐÚNG MẢNG JSON gồm các chuỗi đã dịch theo đúng thứ tự mảng đầu vào.`;

        const userPrompt = JSON.stringify(maskedItems.map((m) => m.maskedText));

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nDanh sách chuỗi cần dịch:\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const resData = (await response.json()) as unknown;
        const candidateText =
          (resData as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
            ?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        const parsedResults = JSON.parse(candidateText) as unknown;
        if (Array.isArray(parsedResults)) {
          maskedItems.forEach(({ seg, tokens, maskedText }, idx) => {
            const rawRes = parsedResults[idx];
            if (typeof rawRes === 'string' && rawRes.trim().length > 0) {
              const sanitized = sanitizeAndValidateTranslation(
                maskedText,
                rawRes,
                tokens,
                config.targetLang
              );
              let clean = sanitized.cleanedText;
              clean = applySafeGlossary(clean, config.glossary);
              seg.translation = unmaskGameTags(clean, tokens);
              seg.status = 'translated';
            }
          });
        }
      } catch (err) {
        console.error('Gemini error, fallback to web translate:', err);
        await Promise.all(
          maskedItems.map(async ({ seg, maskedText, tokens }) => {
            const translatedMasked = await translateViaWebFree(maskedText, config.targetLang);
            seg.translation = unmaskGameTags(translatedMasked, tokens);
            seg.status = 'translated';
          })
        );
      }
    } else {
      // OpenAI / DeepSeek / Claude compatible chat completions
      try {
        const apiKey = config.apiKey || '';
        const endpoint =
          config.endpoint ||
          (config.provider === 'deepseek'
            ? 'https://api.deepseek.com/chat/completions'
            : 'https://api.openai.com/v1/chat/completions');

        const toneInstruction = TONE_INSTRUCTIONS[config.tone] || '';
        const glossaryPrompt =
          config.glossary.length > 0
            ? `BẢNG THUẬT NGỮ BẮT BUỘC:\n` +
              config.glossary.map((g) => `- "${g.term}" => "${g.translation}"`).join('\n')
            : '';
        const pronounPrompt = buildSpeakerPronounPrompt(config.personas || []);

        const systemPrompt = `Bạn là chuyên gia bản địa hóa game sang ${config.targetLang}.
Dịch TOÀN BỘ 100% nội dung sang tiếng Việt chuẩn game, tuyệt đối không để sót từ tiếng Anh.
Giữ nguyên vẹn các thẻ bảo vệ dạng ⟦TAG_0⟧, ⟦TAG_1⟧.
${toneInstruction}
${glossaryPrompt}
${pronounPrompt}
Chỉ trả về JSON array chuỗi đã dịch theo thứ tự.`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model:
              config.model ||
              (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: JSON.stringify(maskedItems.map((m) => m.maskedText)) },
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = (await response.json()) as unknown;
        const content =
          (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
            ?.content || '[]';

        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsedResults = JSON.parse(cleanedContent) as unknown;

        if (Array.isArray(parsedResults)) {
          maskedItems.forEach(({ seg, tokens, maskedText }, idx) => {
            const rawRes = parsedResults[idx];
            if (typeof rawRes === 'string' && rawRes.trim().length > 0) {
              const sanitized = sanitizeAndValidateTranslation(
                maskedText,
                rawRes,
                tokens,
                config.targetLang
              );
              let clean = sanitized.cleanedText;
              clean = applySafeGlossary(clean, config.glossary);
              seg.translation = unmaskGameTags(clean, tokens);
              seg.status = 'translated';
            }
          });
        }
      } catch (err) {
        console.error('API error, fallback to web translate:', err);
        await Promise.all(
          maskedItems.map(async ({ seg, maskedText, tokens }) => {
            const translatedMasked = await translateViaWebFree(maskedText, config.targetLang);
            seg.translation = unmaskGameTags(translatedMasked, tokens);
            seg.status = 'translated';
          })
        );
      }
    }

    if (config.personas && config.personas.length > 0) {
      for (const { seg } of maskedItems) {
        if (seg.speaker && seg.translation) {
          const persona = config.personas.find(
            (p) => p.speaker.toLowerCase() === seg.speaker?.toLowerCase()
          );
          if (persona) {
            seg.translation = autoFixPronouns(seg.translation, persona);
          }
        }
      }
    }

    completed += chunk.length;
    if (onProgress) {
      onProgress(completed, total);
    }
  }

  return updatedSegments;
}
