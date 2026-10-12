/**
 * Game Speaker & Character Persona Analyzer
 * Analyzes speaker roles to assign authentic Vietnamese pronouns (xưng hô)
 * replacing generic/robotic "tôi - bạn" with character-appropriate address terms.
 */

import { AIServiceConfig, SpeakerPersona, TranslatableSegment, TranslationTone } from './types';

export interface SpeakerSampleGroup {
  speaker: string;
  count: number;
  sampleQuotes: string[];
}

/**
 * Scan segments and group them by unique speaker name with sample quotes
 */
export function extractUniqueSpeakers(segments: TranslatableSegment[]): SpeakerSampleGroup[] {
  const map = new Map<string, { count: number; quotes: string[] }>();

  for (const seg of segments) {
    const raw = (seg.speaker || '').trim();
    if (!raw || raw === 'Dẫn truyện' || raw === 'Narrator') continue;

    const existing = map.get(raw);
    if (existing) {
      existing.count++;
      if (existing.quotes.length < 3 && seg.original.trim().length > 0) {
        existing.quotes.push(seg.original.trim());
      }
    } else {
      map.set(raw, {
        count: 1,
        quotes: seg.original.trim().length > 0 ? [seg.original.trim()] : [],
      });
    }
  }

  return Array.from(map.entries()).map(([speaker, val]) => ({
    speaker,
    count: val.count,
    sampleQuotes: val.quotes,
  }));
}

/**
 * Heuristic classifier to determine character role and pronouns without requiring an external AI API call
 */
export function heuristicAnalyzeSpeaker(
  speaker: string,
  sampleQuotes: string[] = [],
  tone: TranslationTone = 'fantasy_rpg'
): SpeakerPersona {
  const lowerName = speaker.toLowerCase();
  const joinedQuotes = sampleQuotes.join(' ').toLowerCase();

  // 1. Elders / Village Chiefs / Mentors
  if (
    lowerName.includes('trưởng làng') ||
    lowerName.includes('trưởng lão') ||
    lowerName.includes('già làng') ||
    lowerName.includes('elder') ||
    lowerName.includes('chief') ||
    lowerName.includes('lão') ||
    lowerName.includes('ông') ||
    lowerName.includes('bác') ||
    lowerName.includes('thầy') ||
    lowerName.includes('master')
  ) {
    if (tone === 'wuxia') {
      return {
        speaker,
        role: 'Bậc tiền bối / Sư phụ',
        gender: 'male',
        ageGroup: 'elder',
        firstPerson: 'Lão phu',
        secondPerson: 'Các hạ',
        relationship: 'Bậc tiền bối với hậu bối lữ khách',
        toneInstruction: 'Uy nghiêm, phong thái chưởng môn, xưng hô Lão phu - Các hạ / Đồ nhi.',
      };
    }
    return {
      speaker,
      role: 'Trưởng làng / Bậc trưởng bối',
      gender: 'male',
      ageGroup: 'elder',
      firstPerson: 'Ta',
      secondPerson: 'Ngươi',
      relationship: 'Trưởng lão bản địa nói chuyện với lữ khách',
      toneInstruction: 'Trang trọng, từng trải, xưng Ta và gọi người chơi là Ngươi hoặc Lữ khách trẻ.',
    };
  }

  // 2. Military Generals / High Commanders (e.g. Tướng quân Vane)
  if (
    lowerName.includes('tướng quân') ||
    lowerName.includes('vane') ||
    lowerName.includes('general') ||
    lowerName.includes('chỉ huy') ||
    lowerName.includes('commander') ||
    joinedQuotes.includes('battalion')
  ) {
    return {
      speaker,
      role: 'Đại tướng quân / Thống soái quân đội',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Ta',
      secondPerson: 'Các ngươi',
      relationship: 'Thống soái chỉ huy ba quân trên chiến trường',
      toneInstruction: 'Hào hùng, kỷ luật thép, đanh thép, xưng Ta và gọi thuộc cấp là Các ngươi / Binh sĩ.',
    };
  }

  // 3. Knights / Royal Guards / Protectors
  if (
    lowerName.includes('hiệp sĩ') ||
    lowerName.includes('knight') ||
    lowerName.includes('gareth') ||
    lowerName.includes('vệ binh') ||
    lowerName.includes('guard') ||
    lowerName.includes('đội trưởng') ||
    lowerName.includes('captain') ||
    joinedQuotes.includes('shield') ||
    joinedQuotes.includes('protect')
  ) {
    return {
      speaker,
      role: 'Hiệp sĩ hoàng gia / Chiến binh',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Tôi',
      secondPerson: 'Các hạ',
      relationship: 'Chiến binh trung thành bảo vệ chính nghĩa',
      toneInstruction: 'Cương trực, khiêm nhường, xưng Tôi và gọi đối phương là Cậu / Các hạ.',
    };
  }

  // 3. Mages / Sorceresses / Academics
  if (
    lowerName.includes('pháp sư') ||
    lowerName.includes('mage') ||
    lowerName.includes('aria') ||
    lowerName.includes('phù thủy') ||
    lowerName.includes('sorcerer') ||
    lowerName.includes('witch') ||
    joinedQuotes.includes('magic') ||
    joinedQuotes.includes('spell')
  ) {
    return {
      speaker,
      role: 'Nữ pháp sư tinh anh',
      gender: 'female',
      ageGroup: 'young',
      firstPerson: 'Tôi',
      secondPerson: 'Cậu',
      relationship: 'Pháp sư thông thái, đồng hành cùng người chơi',
      toneInstruction: 'Thanh lịch, tự tin, xưng Tôi/Mình và gọi người chơi là Cậu.',
    };
  }

  // 4. Kings / Emperors / Lords / Nobles / Queens
  if (
    lowerName.includes('vua') ||
    lowerName.includes('king') ||
    lowerName.includes('lord') ||
    lowerName.includes('hoàng') ||
    lowerName.includes('vương') ||
    lowerName.includes('queen') ||
    lowerName.includes('emperor') ||
    lowerName.includes('chúa tể') ||
    joinedQuotes.includes('royal decree') ||
    joinedQuotes.includes('throne of')
  ) {
    const isFemale = lowerName.includes('nữ') || lowerName.includes('queen') || lowerName.includes('hậu');
    return {
      speaker,
      role: isFemale ? 'Nữ vương / Nữ hoàng tối cao' : 'Quân vương / Lãnh chúa tối cao',
      gender: isFemale ? 'female' : 'male',
      ageGroup: 'adult',
      firstPerson: 'Trẫm',
      secondPerson: 'Khanh',
      relationship: 'Bề trên quân vương ra lệnh cho thần dân',
      toneInstruction: 'Uy quyền tột đỉnh, xưng Trẫm / Ta và gọi thuộc hạ là Khanh / Ngươi.',
    };
  }

  // 5. Merchants / Shopkeepers
  if (
    lowerName.includes('thương nhân') ||
    lowerName.includes('merchant') ||
    lowerName.includes('chủ tiệm') ||
    lowerName.includes('shop') ||
    lowerName.includes('người bán')
  ) {
    return {
      speaker,
      role: 'Thương nhân thương hội',
      gender: 'neutral',
      ageGroup: 'adult',
      firstPerson: 'Tôi',
      secondPerson: 'Quý khách',
      relationship: 'Người bán hàng niềm nở chào đón khách',
      toneInstruction: 'Niềm nở, lịch thiệp, xưng Tôi và gọi người chơi là Quý khách.',
    };
  }

  // 6. Blacksmith / Craftsmen
  if (
    lowerName.includes('thợ rèn') ||
    lowerName.includes('borin') ||
    lowerName.includes('blacksmith') ||
    lowerName.includes('forge') ||
    joinedQuotes.includes('forge') ||
    joinedQuotes.includes('anvil')
  ) {
    return {
      speaker,
      role: 'Thợ rèn danh tiếng / Nghệ nhân chế tác',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Tôi',
      secondPerson: 'Cậu',
      relationship: 'Thợ rèn đúc vũ khí cho lữ khách',
      toneInstruction: 'Hào sảng, bộc trực, thực tế, xưng Tôi và gọi người chơi là Cậu / Chú em.',
    };
  }

  // 7. Young Children / Kids (e.g. Bé May)
  if (
    lowerName.includes('bé ') ||
    lowerName.includes('nhóc') ||
    lowerName.includes('cô bé') ||
    lowerName.includes('may') ||
    lowerName.includes('child') ||
    joinedQuotes.includes('mommy') ||
    joinedQuotes.includes('superhero')
  ) {
    return {
      speaker,
      role: 'Cô bé ngây thơ / Trẻ em làng quê',
      gender: 'female',
      ageGroup: 'young',
      firstPerson: 'Cháu',
      secondPerson: 'Chú',
      relationship: 'Trẻ con ngây thơ ngưỡng mộ người lớn phiêu lưu',
      toneInstruction: 'Hồn nhiên, dễ thương, xưng Cháu (hoặc Em) và gọi đối phương là Chú / Anh / Đại hiệp.',
    };
  }

  // 8. Younger Sister / Loving Companion (e.g. Linh Nhi)
  if (
    lowerName.includes('tiểu muội') ||
    lowerName.includes('linh nhi') ||
    lowerName.includes('muội muội') ||
    lowerName.includes('em gái') ||
    joinedQuotes.includes('huynh trưởng')
  ) {
    return {
      speaker,
      role: 'Tiểu muội / Nữ đồng hành thân thiết',
      gender: 'female',
      ageGroup: 'young',
      firstPerson: 'Muội',
      secondPerson: 'Huynh',
      relationship: 'Muội muội thân thiết quan tâm chăm sóc nhân vật chính',
      toneInstruction: 'Dịu dàng, tình cảm, xưng Muội (hoặc Em) và gọi đối phương là Huynh / Anh.',
    };
  }

  // 9. Assassins / Shadow Rogues (e.g. Kaelen)
  if (
    lowerName.includes('sát thủ') ||
    lowerName.includes('kaelen') ||
    lowerName.includes('assassin') ||
    lowerName.includes('bóng đêm') ||
    lowerName.includes('rogue') ||
    joinedQuotes.includes('dagger') ||
    joinedQuotes.includes('kill')
  ) {
    return {
      speaker,
      role: 'Sát thủ bóng đêm / Thích khách nguy hiểm',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Ta',
      secondPerson: 'Ngươi',
      relationship: 'Kẻ hành nghề trong bóng tối, lạnh lùng cảnh giác',
      toneInstruction: 'Lạnh lùng, sắc bén, ít lời, xưng Ta / Tôi và gọi đối phương là Ngươi.',
    };
  }

  // 10. High Priestess / Clerics / Nuns (e.g. Seraphina)
  if (
    lowerName.includes('thần quan') ||
    lowerName.includes('seraphina') ||
    lowerName.includes('priest') ||
    lowerName.includes('tu sĩ') ||
    lowerName.includes('nữ tu') ||
    joinedQuotes.includes('prayer') ||
    joinedQuotes.includes('sanctuary')
  ) {
    return {
      speaker,
      role: 'Thần quan / Nữ tu thánh điện',
      gender: 'female',
      ageGroup: 'adult',
      firstPerson: 'Ta',
      secondPerson: 'Con',
      relationship: 'Bậc tu sĩ thánh khiết ban phước cho chúng sinh',
      toneInstruction: 'Thánh thiện, từ bi, trang nghiêm, xưng Ta và gọi người chơi là Con / Lữ khách.',
    };
  }

  // 11. Military General / Commander (e.g. Tướng quân Vane)
  if (
    lowerName.includes('tướng quân') ||
    lowerName.includes('vane') ||
    lowerName.includes('general') ||
    lowerName.includes('chỉ huy') ||
    lowerName.includes('commander') ||
    joinedQuotes.includes('battalion') ||
    joinedQuotes.includes('soldier')
  ) {
    return {
      speaker,
      role: 'Đại tướng quân / Thống soái quân đội',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Ta',
      secondPerson: 'Các ngươi',
      relationship: 'Thống soái chỉ huy ba quân trên chiến trường',
      toneInstruction: 'Hào hùng, kỷ luật thép, đanh thép, xưng Ta và gọi thuộc cấp là Các ngươi / Binh sĩ.',
    };
  }

  // 12. Villains / Dark Cultists (e.g. Hắc y nhân)
  if (
    lowerName.includes('hắc y nhân') ||
    lowerName.includes('ác nhân') ||
    lowerName.includes('cultist') ||
    lowerName.includes('tà giáo') ||
    lowerName.includes('kẻ thù') ||
    joinedQuotes.includes('vermin') ||
    joinedQuotes.includes('pathetic')
  ) {
    return {
      speaker,
      role: 'Tà giáo đồ / Nhân vật phản diện',
      gender: 'neutral',
      ageGroup: 'adult',
      firstPerson: 'Ta',
      secondPerson: 'Ngươi',
      relationship: 'Kẻ thù nguy hiểm khinh miệt phàm nhân',
      toneInstruction: 'Nham hiểm, ngạo mạn, khinh thị, xưng Ta và gọi đối phương là Ngươi / Lũ rệp.',
    };
  }

  // 13. Detectives / Investigators (e.g. Thám tử Vance)
  if (
    lowerName.includes('thám tử') ||
    lowerName.includes('vance') ||
    lowerName.includes('detective') ||
    lowerName.includes('investigator') ||
    joinedQuotes.includes('footprint') ||
    joinedQuotes.includes('culprit')
  ) {
    return {
      speaker,
      role: 'Thám tử tư / Chuyên gia điều tra',
      gender: 'male',
      ageGroup: 'adult',
      firstPerson: 'Tôi',
      secondPerson: 'Anh',
      relationship: 'Nhà phân tích phá án lý trí',
      toneInstruction: 'Điềm đạm, suy luận logic, chuẩn mực, xưng Tôi và gọi đối phương là Anh / Cậu.',
    };
  }

  // 14. Visual Novel School / Romance Archetype (e.g. Eileen, Sylvie)
  if (
    tone === 'visual_novel' ||
    lowerName === 'eileen' ||
    lowerName === 'sylvie' ||
    lowerName === 'e' ||
    lowerName === 's' ||
    lowerName === 'mc'
  ) {
    return {
      speaker,
      role: 'Bạn học / Nữ chính Visual Novel',
      gender: 'female',
      ageGroup: 'young',
      firstPerson: 'Mình',
      secondPerson: 'Cậu',
      relationship: 'Bạn bè học viện / Người thân thiết',
      toneInstruction: 'Dễ thương, tình cảm, xưng Mình (hoặc Em) và gọi Cậu (hoặc Anh).',
    };
  }

  // 7. General Fantasy RPG default
  return {
    speaker,
    role: 'Nhân vật phiêu lưu',
    gender: 'neutral',
    ageGroup: 'adult',
    firstPerson: 'Tôi',
    secondPerson: 'Bạn',
    relationship: 'Nhân vật trong hành trình phiêu lưu',
    toneInstruction: 'Tự nhiên, chuẩn phong cách game.',
  };
}

/**
 * Runs persona analysis for all speakers in project
 */
export async function analyzeProjectSpeakers(
  segments: TranslatableSegment[],
  config: AIServiceConfig
): Promise<SpeakerPersona[]> {
  const groups = extractUniqueSpeakers(segments);
  if (groups.length === 0) return [];

  // Try AI Analysis if API key is provided and provider supports generative analysis
  if (config.apiKey && (config.provider === 'gemini' || config.provider === 'openai' || config.provider === 'deepseek')) {
    try {
      const aiPersonas = await analyzeSpeakerPersonasWithAI(groups, config);
      if (aiPersonas.length > 0) {
        return aiPersonas;
      }
    } catch (err) {
      console.warn('AI Speaker analysis failed, falling back to heuristic engine:', err);
    }
  }

  // Fast offline heuristic fallback
  return groups.map((g) => heuristicAnalyzeSpeaker(g.speaker, g.sampleQuotes, config.tone));
}

/**
 * Uses Generative AI to deeply analyze speaker roles and relationship dynamics
 */
export async function analyzeSpeakerPersonasWithAI(
  groups: SpeakerSampleGroup[],
  config: AIServiceConfig
): Promise<SpeakerPersona[]> {
  const systemPrompt = `Bạn là chuyên gia bản địa hóa kịch bản game sang tiếng Việt chuyên sâu về đại từ nhân xưng (xưng hô).
Trong game, việc dịch 'I - you' máy móc thành 'tôi - bạn' là THẤT BẠI. Bạn phải phân tích vai trò nhân vật để tạo cặp đại từ tự nhiên nhất:
- Trưởng lão/già làng: Xưng "Ta", gọi "Ngươi" hoặc "Lữ khách"
- Hiệp sĩ: Xưng "Tôi" hoặc "Thần", gọi "Các hạ" hoặc "Bệ hạ"
- Bạn học/nữ chính anime: Xưng "Mình/Tớ/Em", gọi "Cậu/Anh"
- Tiên hiệp/Kiếm hiệp: Xưng "Tại hạ/Lão phu", gọi "Các hạ/Huynh đài"
- Quân vương: Xưng "Trẫm/Ta", gọi "Khanh/Ngươi"

Hãy trả về DUY NHẤT một mảng JSON các đối tượng SpeakerPersona theo schema:
[
  {
    "speaker": "Tên nhân vật",
    "role": "Mô tả vai trò (ví dụ: Trưởng làng Elden - Bậc trưởng bối)",
    "gender": "male" | "female" | "neutral",
    "ageGroup": "young" | "adult" | "elder",
    "firstPerson": "Đại từ xưng (Ta, Tôi, Mình, Thần...)",
    "secondPerson": "Đại từ hô (Ngươi, Cậu, Bạn, Bệ hạ...)",
    "relationship": "Mô tả quan hệ",
    "toneInstruction": "Gợi ý văn phong"
  }
]`;

  const userPrompt = JSON.stringify(
    groups.map((g) => ({
      speaker: g.speaker,
      sampleQuotes: g.sampleQuotes,
    }))
  );

  if (config.provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nDanh sách nhân vật:\n${userPrompt}` }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini persona error: ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return JSON.parse(raw) as SpeakerPersona[];
  }

  // OpenAI / DeepSeek format
  const endpoint =
    config.endpoint ||
    (config.provider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://api.openai.com/v1/chat/completions');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`API persona error: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data?.choices?.[0]?.message?.content || '[]';
  const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean) as SpeakerPersona[];
}

/**
 * Builds a prompt block containing pronoun rules to inject into translation engines
 */
export function buildSpeakerPronounPrompt(personas: SpeakerPersona[]): string {
  if (!personas || personas.length === 0) return '';

  const lines = personas
    .filter((p) => p.firstPerson || p.secondPerson)
    .map(
      (p) =>
        `- [${p.speaker}] (${p.role}): Xưng "${p.firstPerson}", gọi đối phương là "${p.secondPerson}". ${p.toneInstruction || ''}`
    );

  if (lines.length === 0) return '';

  return (
    `QUY TẮC ĐẠI TỪ NHÂN XƯNG (XƯNG HÔ) THEO NHÂN VẬT (TUYỆT ĐỐI TUÂN THỦ):\n` +
    lines.join('\n') +
    `\nTUYỆT ĐỐI KHÔNG DỊCH MÁY MÓC 'I - YOU' THÀNH 'TÔI - BẠN' NẾU NHÂN VẬT CÓ ĐẠI TỪ RIÊNG TRÊN ĐÂY.\n`
  );
}

/**
 * Format a per-line guideline for individual segment translation
 */
export function formatSpeakerDialogueGuideline(
  speaker: string | undefined,
  personas: SpeakerPersona[] | undefined
): string {
  if (!speaker || !personas) return '';
  const p = personas.find((item) => item.speaker.toLowerCase() === speaker.toLowerCase());
  if (!p || (!p.firstPerson && !p.secondPerson)) return '';

  return `[NHÂN VẬT: "${p.speaker}" (${p.role}) ➜ BẮT BUỘC Xưng "${p.firstPerson}", Gọi "${p.secondPerson}"]`;
}
