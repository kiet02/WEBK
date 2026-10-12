import { describe, it, expect } from 'vitest';
import {
  detectGameEngine,
  maskGameTags,
  unmaskGameTags,
  extractGameTags,
  extractRPGMakerSegments,
  injectRPGMakerTranslations,
  extractRenpySegments,
  injectRenpyTranslations,
  extractUnityKeyValueSegments,
  injectUnityKeyValueTranslations,
  buildZipArchive,
  SAMPLE_PROJECTS,
  parseGameProject,
  translateSegmentsBatch,
} from './index';

describe('Game Translator Engine Detection', () => {
  it('correctly detects RPG Maker MV/MZ from file paths and json content', () => {
    const rpgSample = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_sample')!;
    const files = rpgSample.files.map((f) => ({
      name: f.path.split('/').pop()!,
      path: f.path,
      size: f.content.length,
      sampleContent: f.content,
    }));

    const result = detectGameEngine(files);
    expect(result.engine).toBe('rpg_maker_mvmz');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.name).toContain('RPG Maker');
  });

  it("correctly detects Ren'Py from .rpy scripts and dialogue statements", () => {
    const renpySample = SAMPLE_PROJECTS.find((p) => p.id === 'renpy_sample')!;
    const files = renpySample.files.map((f) => ({
      name: f.path.split('/').pop()!,
      path: f.path,
      size: f.content.length,
      sampleContent: f.content,
    }));

    const result = detectGameEngine(files);
    expect(result.engine).toBe('renpy');
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.name).toContain("Ren'Py");
  });

  it('correctly detects Unity Localization / XUnity from key-value structure', () => {
    const unitySample = SAMPLE_PROJECTS.find((p) => p.id === 'unity_sample')!;
    const files = unitySample.files.map((f) => ({
      name: f.path.split('/').pop()!,
      path: f.path,
      size: f.content.length,
      sampleContent: f.content,
    }));

    const result = detectGameEngine(files);
    expect(result.engine).toBe('unity_localization');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

describe('Tag Guard & Masker Safety', () => {
  it('preserves RPG Maker escape codes \\V[1] and \\C[2] without distortion', () => {
    const original = 'Welcome traveler! Here is \\V[1] Gold and a \\C[2]Potion\\C[0].';
    const tags = extractGameTags(original);
    expect(tags).toContain('\\V[1]');
    expect(tags).toContain('\\C[2]');
    expect(tags).toContain('\\C[0]');

    const { maskedText, tokens } = maskGameTags(original);
    expect(maskedText).not.toContain('\\V[1]');
    expect(maskedText).toContain('⟦TAG_');

    const simulatedTranslated = maskedText.replace('traveler', 'lữ khách').replace('Gold', 'Vàng');
    const restored = unmaskGameTags(simulatedTranslated, tokens);

    expect(restored).toContain('\\V[1]');
    expect(restored).toContain('\\C[2]');
    expect(restored).toContain('lữ khách');
  });

  it("preserves Ren'Py format tags and player variables", () => {
    const original = 'Hello [player_name]! Check this {i}magic spell{/i}.';
    const { maskedText, tokens } = maskGameTags(original);
    expect(tokens.length).toBe(3); // [player_name], {i}, {/i}

    const translated = maskedText.replace('Hello', 'Xin chào');
    const restored = unmaskGameTags(translated, tokens);

    expect(restored).toContain('Xin chào');
    expect(restored).toContain('[player_name]');
    expect(restored).toContain('{i}');
    expect(restored).toContain('{/i}');
  });
});

describe('RPG Maker Parser & Re-injector', () => {
  it('extracts dialogue code 401 and choices code 102 accurately', () => {
    const rpgSample = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_sample')!;
    const mapFile = rpgSample.files.find((f) => f.path === 'data/Map001.json')!;

    const segments = extractRPGMakerSegments(mapFile.path, mapFile.content);
    expect(segments.length).toBeGreaterThan(2);

    const firstDialogue = segments.find((s) => s.original.includes('Welcome to Eldoria'));
    expect(firstDialogue).toBeDefined();
    expect(firstDialogue?.speaker).toBe('Trưởng làng Elden');

    // Simulate translation
    firstDialogue!.translation = 'Chào mừng đến với làng Eldoria, dũng sĩ!';
    const reInjected = injectRPGMakerTranslations(mapFile.content, segments);

    expect(reInjected).toContain('Chào mừng đến với làng Eldoria, dũng sĩ!');
    expect(() => JSON.parse(reInjected)).not.toThrow();
  });
});

describe('Ren\'Py Parser & Re-injector', () => {
  it('extracts dialogue lines and updates in-place', () => {
    const renpySample = SAMPLE_PROJECTS.find((p) => p.id === 'renpy_sample')!;
    const scriptFile = renpySample.files[0];

    const segments = extractRenpySegments(scriptFile.path, scriptFile.content);
    expect(segments.length).toBeGreaterThan(3);

    const eileenLine = segments.find((s) => s.speaker === 'e');
    expect(eileenLine).toBeDefined();

    eileenLine!.translation = 'Chào cậu, [player_name]! Mình đã đợi cậu ở thư viện đấy.';
    const reInjected = injectRenpyTranslations(scriptFile.content, segments);

    expect(reInjected).toContain('Chào cậu, [player_name]!');
    expect(reInjected).toContain('e "Chào cậu, [player_name]! Mình đã đợi cậu ở thư viện đấy."');
  });
});

describe('Unity Key-Value Adapter', () => {
  it('extracts and updates key-value lines', () => {
    const unitySample = SAMPLE_PROJECTS.find((p) => p.id === 'unity_sample')!;
    const file = unitySample.files[0];

    const segments = extractUnityKeyValueSegments(file.path, file.content);
    expect(segments.length).toBeGreaterThan(4);

    const pressStart = segments.find((s) => s.original === 'Press Start Button');
    expect(pressStart).toBeDefined();

    pressStart!.translation = 'Nhấn Nút Bắt Đầu';
    const reInjected = injectUnityKeyValueTranslations(file.content, segments);

    expect(reInjected).toContain('Press Start Button=Nhấn Nút Bắt Đầu');
  });
});

describe('Zero-Dependency ZIP Packager', () => {
  it('creates valid PKZIP byte stream with correct magic headers', () => {
    const zipBytes = buildZipArchive([
      { path: 'test.txt', content: 'Hello World' },
      { path: 'data/sub.json', content: '{"status": "ok"}' },
    ]);

    expect(zipBytes.length).toBeGreaterThan(50);
    // PK\x03\x04 signature check
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });
});

describe('End-to-End Batch Translation & Glossary', () => {
  it('applies glossary and batch mock translation', async () => {
    const rpgSample = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_sample')!;
    const project = parseGameProject(
      'Test RPG',
      rpgSample.files.map((f) => ({
        name: f.path,
        path: f.path,
        content: f.content,
        size: f.content.length,
      }))
    );

    expect(project.segments.length).toBeGreaterThan(0);

    const updated = await translateSegmentsBatch(project.segments, {
      provider: 'mock',
      sourceLang: 'en',
      targetLang: 'vi',
      tone: 'fantasy_rpg',
      glossary: [
        {
          id: '1',
          term: 'Eldoria',
          translation: 'Ái Nhĩ Đa Lợi Á',
          category: 'location',
        },
      ],
    });

    const translatedSegment = updated.find((s) => s.original.includes('Eldoria'));
    expect(translatedSegment?.translation).toContain('Ái Nhĩ Đa Lợi Á');
  });
});

describe('WebGPU AI Integration', () => {
  it('exposes supported WebGPU models list with lightweight Qwen and SmolLM', async () => {
    const { SUPPORTED_WEBGPU_MODELS, checkWebGPUSupport } = await import('./index');
    expect(SUPPORTED_WEBGPU_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(SUPPORTED_WEBGPU_MODELS.some((m) => m.id.includes('Qwen'))).toBe(true);
    expect(SUPPORTED_WEBGPU_MODELS.some((m) => m.id.includes('SmolLM'))).toBe(true);

    const status = await checkWebGPUSupport();
    expect(typeof status.supported).toBe('boolean');
  });

  it('gracefully handles WebGPU provider translation batch with fallback', async () => {
    const rpgSample = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_sample')!;
    const project = parseGameProject(
      'WebGPU Test',
      rpgSample.files.map((f) => ({
        name: f.path,
        path: f.path,
        content: f.content,
        size: f.content.length,
      }))
    );

    const updated = await translateSegmentsBatch(project.segments.slice(0, 2), {
      provider: 'webgpu',
      sourceLang: 'en',
      targetLang: 'vi',
      tone: 'fantasy_rpg',
      glossary: [],
    });

    expect(updated[0].status).toBe('translated');
    expect(updated[0].translation.length).toBeGreaterThan(0);
  });
});

describe('Python Accelerator Engine Integration', () => {
  it('connects to local Python server health endpoint and verifies hardware', async () => {
    const { checkPythonEngineStatus } = await import('./index');
    const status = await checkPythonEngineStatus();
    expect(status.online).toBe(true);
    expect(status.activeWorkers).toBeGreaterThan(0);
    expect(status.hardware).toBeDefined();
  });

  it('translates segments using Python multi-threaded backend', async () => {
    const { translateWithPythonEngine } = await import('./index');
    const results = await translateWithPythonEngine(
      [
        { id: '1', text: 'Welcome to Eldoria village, brave traveler! Take this ⟦TAG_0⟧ Gold.' },
        { id: '2', text: 'Accept Quest' },
      ],
      { targetLang: 'vi' }
    );

    expect(results.get('1')).toContain('Eldoria');
    expect(results.get('1')).toContain('Vàng');
    expect(results.get('2')).toBe('Nhận Nhiệm Vụ');
  });

  it('runs Python accelerator benchmark and measures throughput', async () => {
    const { runPythonBenchmark } = await import('./index');
    const bench = await runPythonBenchmark(10);
    expect(bench.throughput).toBeGreaterThan(0);
    expect(bench.durationMs).toBeGreaterThan(0);
    expect(bench.workers).toBeGreaterThan(0);
  });

  it('integrates python_local provider in translateSegmentsBatch seamlessly', async () => {
    const rpgSample = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_sample')!;
    const project = parseGameProject(
      'Python Test',
      rpgSample.files.map((f) => ({
        name: f.path,
        path: f.path,
        content: f.content,
        size: f.content.length,
      }))
    );

    const updated = await translateSegmentsBatch(project.segments.slice(0, 2), {
      provider: 'python_local',
      sourceLang: 'en',
      targetLang: 'vi',
      tone: 'fantasy_rpg',
      glossary: [],
    });

    expect(updated[0].status).toBe('translated');
    expect(updated[1].status).toBe('translated');
    expect(updated[1].translation).toContain('Eldoria');
  });

  describe('Anti-Hallucination & Sanitizer Guard', () => {
    it('detects and cleans chatty dictionary definition explanations', async () => {
      const { sanitizeAndValidateTranslation } = await import('./index');
      const chattyText =
        '"Accept Quest" là một hành động quan trọng trong quá trình chơi game, nó đòi hỏi sự chấp nhận và đồng ý với những điều kiện cụ thể.';
      const res = sanitizeAndValidateTranslation('Accept Quest', chattyText, []);

      // Should detect hallucination and replace with clean catalog 'Nhận Nhiệm Vụ'
      expect(res.cleanedText).toBe('Nhận Nhiệm Vụ');
      expect(res.explanationStripped).toBe(true);
    });

    it('detects and cleans story hallucination with massive length explosion', async () => {
      const { sanitizeAndValidateTranslation } = await import('./index');
      const storyText =
        'In the bustling market town of Zephyria, the vibrant atmosphere was filled with the hustle and bustle of commerce. The streets were lined with colorful stalls selling everything from fresh produce to exotic goods.';
      const res = sanitizeAndValidateTranslation(
        'Thị trấn Khởi Đầu (Starting Town)',
        storyText,
        []
      );

      expect(res.cleanedText).toBe('Thị trấn Khởi Đầu (Starting Town)');
    });

    it('detects and recovers dropped tags when AI model omits them', async () => {
      const { sanitizeAndValidateTranslation } = await import('./index');
      const textWithoutTag = 'Chào mừng đến với làng Eldoria! Hãy nhận lấy Vàng này.';
      const tokens = [{ token: '⟦TAG_0⟧', original: '\\V[1]' }];
      const res = sanitizeAndValidateTranslation(
        'Welcome to Eldoria! Take this ⟦TAG_0⟧ Gold.',
        textWithoutTag,
        tokens
      );

      expect(res.tagsRecovered).toBe(true);
      expect(res.cleanedText).toContain('⟦TAG_0⟧');
    });

    it('safely applies glossary terms using word boundaries only', async () => {
      const { applySafeGlossary } = await import('./index');
      const text = 'Heroic Hero meets Heroine with ⟦TAG_0⟧ Gold.';
      const glossary = [
        { id: '1', term: 'Hero', translation: 'Anh hùng', category: 'character' as const },
        { id: '2', term: 'Gold', translation: 'Vàng', category: 'item' as const },
      ];
      const result = applySafeGlossary(text, glossary);
      // 'Heroic' and 'Heroine' should NOT be replaced, only exact word 'Hero'
      expect(result).toContain('Heroic Anh hùng meets Heroine with ⟦TAG_0⟧ Vàng.');
    });

    it('detects and rejects Chinese (CJK) language slips when translating to Vietnamese', async () => {
      const { sanitizeAndValidateTranslation } = await import('./index');
      const chineseSlip =
        '的一位忠勇的皇家骑士，致力于保护无辜的人们，他的重装铠甲闪耀着光芒。';
      const orig =
        'A loyal royal knight dedicated to protecting the innocent with his heavy shield.';
      const res = sanitizeAndValidateTranslation(orig, chineseSlip, [], 'vi');

      // Should detect Chinese hallucination and fall back to catalog
      expect(res.cleanedText).toContain('hiệp sĩ hoàng gia');
      expect(res.reason).toContain('tiếng Trung');
    });
  });

  describe('Speaker Role & Pronoun Analysis Engine (Đại Từ Nhân Xưng)', () => {
    it('groups segments by unique speaker and collects sample dialogue quotes', async () => {
      const { extractUniqueSpeakers } = await import('./index');
      const sampleSegments = [
        {
          id: '1',
          file: 'map.json',
          original: 'Welcome to our village, young traveler!',
          translation: '',
          status: 'untranslated' as const,
          tags: [],
          speaker: 'Trưởng làng Elden',
          meta: {},
        },
        {
          id: '2',
          file: 'map.json',
          original: 'Beware of the bandits near the northern pass.',
          translation: '',
          status: 'untranslated' as const,
          tags: [],
          speaker: 'Trưởng làng Elden',
          meta: {},
        },
        {
          id: '3',
          file: 'map.json',
          original: 'I will shield you with all my might!',
          translation: '',
          status: 'untranslated' as const,
          tags: [],
          speaker: 'Gareth',
          meta: {},
        },
      ];

      const groups = extractUniqueSpeakers(sampleSegments);
      expect(groups.length).toBe(2);

      const elder = groups.find((g) => g.speaker === 'Trưởng làng Elden');
      expect(elder).toBeDefined();
      expect(elder?.count).toBe(2);
      expect(elder?.sampleQuotes).toContain('Welcome to our village, young traveler!');

      const knight = groups.find((g) => g.speaker === 'Gareth');
      expect(knight).toBeDefined();
      expect(knight?.count).toBe(1);
    });

    it('correctly maps character archetypes to authentic Vietnamese pronouns', async () => {
      const { heuristicAnalyzeSpeaker } = await import('./index');

      // 1. Village Elder -> Ta - Ngươi
      const elder = heuristicAnalyzeSpeaker('Trưởng làng Elden', ['Welcome to our village.'], 'fantasy_rpg');
      expect(elder.firstPerson).toBe('Ta');
      expect(elder.secondPerson).toBe('Ngươi');
      expect(elder.ageGroup).toBe('elder');
      expect(elder.role).toContain('Trưởng');

      // 2. Knight Gareth -> Tôi - Các hạ
      const knight = heuristicAnalyzeSpeaker('Gareth', ['I will shield you!'], 'fantasy_rpg');
      expect(knight.firstPerson).toBe('Tôi');
      expect(knight.secondPerson).toBe('Các hạ');
      expect(knight.role).toContain('Hiệp sĩ');

      // 3. Sorceress Aria -> Tôi - Cậu (Young Female Mage)
      const mage = heuristicAnalyzeSpeaker('Aria', ['Behold my magical powers!'], 'fantasy_rpg');
      expect(mage.firstPerson).toBe('Tôi');
      expect(mage.secondPerson).toBe('Cậu');
      expect(mage.gender).toBe('female');

      // 4. Visual Novel Girl -> Mình - Cậu
      const vn = heuristicAnalyzeSpeaker('Eileen', ['Are we going to school together?'], 'visual_novel');
      expect(vn.firstPerson).toBe('Mình');
      expect(vn.secondPerson).toBe('Cậu');
      expect(vn.role).toContain('Visual Novel');

      // 5. King -> Trẫm - Khanh
      const king = heuristicAnalyzeSpeaker('Vua Arthur', ['Hear my royal decree!'], 'fantasy_rpg');
      expect(king.firstPerson).toBe('Trẫm');
      expect(king.secondPerson).toBe('Khanh');

      // 6. Wuxia Elder -> Lão phu - Các hạ
      const wuxiaElder = heuristicAnalyzeSpeaker('Trưởng lão Võ Đang', ['Các hạ võ công cao cường'], 'wuxia');
      expect(wuxiaElder.firstPerson).toBe('Lão phu');
      expect(wuxiaElder.secondPerson).toBe('Các hạ');
    });

    it('builds clear prompt instructions forbidding robotic tôi-bạn', async () => {
      const { buildSpeakerPronounPrompt, formatSpeakerDialogueGuideline } = await import('./index');
      const personas = [
        {
          speaker: 'Trưởng làng Elden',
          role: 'Bậc trưởng bối',
          gender: 'male' as const,
          ageGroup: 'elder' as const,
          firstPerson: 'Ta',
          secondPerson: 'Ngươi',
          relationship: 'Trưởng lão với lữ khách',
          toneInstruction: 'Xưng Ta và gọi người chơi là Ngươi.',
        },
      ];

      const prompt = buildSpeakerPronounPrompt(personas);
      expect(prompt).toContain('QUY TẮC ĐẠI TỪ NHÂN XƯNG');
      expect(prompt).toContain('[Trưởng làng Elden]');
      expect(prompt).toContain('Xưng "Ta", gọi đối phương là "Ngươi"');
      expect(prompt).toContain('TUYỆT ĐỐI KHÔNG DỊCH MÁY MÓC \'I - YOU\' THÀNH \'TÔI - BẠN\'');

      const guideline = formatSpeakerDialogueGuideline('Trưởng làng Elden', personas);
      expect(guideline).toContain('BẮT BUỘC Xưng "Ta", Gọi "Ngươi"');
    });

    it('automatically extracts and embeds personas during project parsing', async () => {
      const { parseGameProject, SAMPLE_PROJECTS } = await import('./index');
      const sample = SAMPLE_PROJECTS[0]; // RPG Maker sample
      const project = parseGameProject(
        sample.name,
        sample.files.map((f) => ({
          name: f.path,
          path: f.path,
          content: f.content,
          size: f.content.length,
        }))
      );

      expect(project.personas).toBeDefined();
      expect(project.personas?.length).toBeGreaterThan(0);

      const speakerNames = project.personas?.map((p) => p.speaker);
      expect(speakerNames).toContain('Trưởng làng Elden');
      expect(speakerNames).toContain('Gareth');
    });

    it('correctly ingests 100 RPG Maker dialogues and analyzes 13 distinct speakers without prior role labels', async () => {
      const { parseGameProject, SAMPLE_PROJECTS } = await import('./index');
      const sample100 = SAMPLE_PROJECTS.find((p) => p.id === 'rpg_maker_100_sample')!;
      expect(sample100).toBeDefined();

      const project = parseGameProject(
        sample100.name,
        sample100.files.map((f) => ({
          name: f.path,
          path: f.path,
          content: f.content,
          size: f.content.length,
        }))
      );

      // Verify exact 100 dialogue lines extracted (+ 1 map display name = 101 total segments)
      const dialogueSegments = project.segments.filter((s) => s.speaker);
      expect(dialogueSegments.length).toBe(100);
      expect(project.segments.length).toBe(101);

      // Verify all 13 distinct characters identified
      expect(project.personas).toBeDefined();
      expect(project.personas?.length).toBe(13);

      const personasMap = new Map(project.personas?.map((p) => [p.speaker, p]));

      // 1. Trưởng lão Cedric: Elder
      const cedric = personasMap.get('Trưởng lão Cedric');
      expect(cedric?.firstPerson).toBe('Ta');
      expect(cedric?.secondPerson).toBe('Ngươi');
      expect(cedric?.ageGroup).toBe('elder');

      // 2. Nữ vương Aurelia: Queen
      const aurelia = personasMap.get('Nữ vương Aurelia');
      expect(aurelia?.firstPerson).toBe('Trẫm');
      expect(aurelia?.secondPerson).toBe('Khanh');

      // 3. Thợ rèn Borin: Blacksmith
      const borin = personasMap.get('Thợ rèn Borin');
      expect(borin?.role).toContain('Thợ rèn');
      expect(borin?.firstPerson).toBe('Tôi');
      expect(borin?.secondPerson).toBe('Cậu');

      // 4. Bé May: Little girl
      const may = personasMap.get('Bé May');
      expect(may?.firstPerson).toBe('Cháu');
      expect(may?.secondPerson).toBe('Chú');
      expect(may?.gender).toBe('female');
      expect(may?.ageGroup).toBe('young');

      // 5. Tiểu muội Linh Nhi: Younger sister
      const linhNhi = personasMap.get('Tiểu muội Linh Nhi');
      expect(linhNhi?.firstPerson).toBe('Muội');
      expect(linhNhi?.secondPerson).toBe('Huynh');

      // 6. Sát thủ Kaelen: Assassin
      const kaelen = personasMap.get('Sát thủ Kaelen');
      expect(kaelen?.firstPerson).toBe('Ta');
      expect(kaelen?.secondPerson).toBe('Ngươi');

      // 7. Thần quan Seraphina: Priestess
      const seraphina = personasMap.get('Thần quan Seraphina');
      expect(seraphina?.firstPerson).toBe('Ta');
      expect(seraphina?.secondPerson).toBe('Con');

      // 8. Tướng quân Vane: General
      const vane = personasMap.get('Tướng quân Vane');
      expect(vane?.firstPerson).toBe('Ta');
      expect(vane?.secondPerson).toBe('Các ngươi');

      // 9. Bác Ba: Rustic Elder
      const bacBa = personasMap.get('Bác Ba');
      expect(bacBa?.firstPerson).toBe('Ta');
      expect(bacBa?.secondPerson).toBe('Ngươi');

      // 10. Hắc y nhân: Villain
      const hacY = personasMap.get('Hắc y nhân');
      expect(hacY?.firstPerson).toBe('Ta');
      expect(hacY?.secondPerson).toBe('Ngươi');

      // 11. Thám tử Vance: Detective
      const vance = personasMap.get('Thám tử Vance');
      expect(vance?.firstPerson).toBe('Tôi');
      expect(vance?.secondPerson).toBe('Anh');
    });
  });
});
