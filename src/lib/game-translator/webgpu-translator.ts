/**
 * WebGPU On-Device AI Translation Engine
 * Runs LLMs entirely inside the browser using client-side WebGPU.
 * Zero data sent to servers, 100% private, zero API keys required.
 */

import { GlossaryItem, WebGPUModelProgress, WebGPUStatus } from './types';
import { sanitizeAndValidateTranslation } from './sanitizer';
import { OFFLINE_SENTENCE_CATALOG } from './catalog';

export const SUPPORTED_WEBGPU_MODELS = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B Instruct - Khuyên Dùng)',
    size: '~380 MB',
    speed: 'Siêu Nhanh (50-80 tokens/s)',
    description: 'Tối ưu tốt cho dịch thuật đa ngôn ngữ và tiếng Việt, nhẹ và tải nhanh nhất.',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 (360M Instruct)',
    size: '~230 MB',
    speed: 'Cực Nhanh (80-120 tokens/s)',
    description: 'Mô hình siêu nhẹ, thích hợp máy có cấu hình GPU khiêm tốn.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (1B Instruct)',
    size: '~780 MB',
    speed: 'Trung Bình (25-45 tokens/s)',
    description: 'Chất lượng câu từ tinh tế hơn cho các đoạn văn bản dài và phức tạp.',
  },
];

// Minimal typed interface for MLC Engine to prevent 'any'
interface MLCChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MLCChatCompletionResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

interface MLCEngineInterface {
  chat: {
    completions: {
      create: (params: {
        messages: MLCChatCompletionMessage[];
        temperature?: number;
        max_tokens?: number;
      }) => Promise<MLCChatCompletionResponse>;
    };
  };
  unload?: () => Promise<void>;
}

interface WebLLMModule {
  CreateMLCEngine: (
    model: string,
    options?: {
      initProgressCallback?: (report: { progress: number; text: string }) => void;
    }
  ) => Promise<MLCEngineInterface>;
}

// Global cached engine instance
let activeEngine: MLCEngineInterface | null = null;
let currentLoadedModelId: string | null = null;

/**
 * Check if the user's browser and hardware support WebGPU
 */
export async function checkWebGPUSupport(): Promise<WebGPUStatus> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      error: 'WebGPU chỉ có thể chạy trên môi trường trình duyệt (Client-side).',
    };
  }

  // Type narrowing for navigator.gpu without using 'any'
  const nav = navigator as unknown as {
    gpu?: {
      requestAdapter: () => Promise<{
        requestAdapterInfo?: () => Promise<{
          vendor?: string;
          architecture?: string;
          device?: string;
          description?: string;
        }>;
        info?: {
          vendor?: string;
          architecture?: string;
          device?: string;
          description?: string;
        };
      } | null>;
    };
  };

  if (!nav.gpu) {
    return {
      supported: false,
      error:
        'Trình duyệt chưa hỗ trợ WebGPU. Vui lòng sử dụng Chrome 113+, Edge 113+, hoặc Safari 18+ trên hệ điều hành mới nhất.',
    };
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        error: 'Không tìm thấy phần cứng GPU tương thích WebGPU trên thiết bị của bạn.',
      };
    }

    let vendor = 'Unknown';
    let architecture = 'Unknown';
    let adapterName = 'Phần cứng WebGPU Sẵn Sàng';

    if (adapter.requestAdapterInfo) {
      try {
        const info = await adapter.requestAdapterInfo();
        vendor = info.vendor || vendor;
        architecture = info.architecture || architecture;
        adapterName = info.description || info.device || `${vendor} ${architecture}`;
      } catch {
        // Fallback to adapter.info if requestAdapterInfo fails
      }
    } else if (adapter.info) {
      vendor = adapter.info.vendor || vendor;
      architecture = adapter.info.architecture || architecture;
      adapterName = adapter.info.description || adapter.info.device || `${vendor} ${architecture}`;
    }

    return {
      supported: true,
      adapterName,
      vendor,
      architecture,
    };
  } catch (err) {
    return {
      supported: false,
      error: `Lỗi khi khởi tạo WebGPU adapter: ${String(err)}`,
    };
  }
}

/**
 * Loads and initializes a WebGPU model into browser memory (using WebLLM)
 */
export async function loadWebGPUModel(
  modelId: string = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  onProgress?: (progress: WebGPUModelProgress) => void
): Promise<MLCEngineInterface> {
  // If already loaded and model matches, return cached engine
  if (activeEngine && currentLoadedModelId === modelId) {
    if (onProgress) {
      onProgress({
        progress: 1.0,
        text: 'Mô hình đã sẵn sàng trong bộ nhớ WebGPU.',
        isLoaded: true,
      });
    }
    return activeEngine;
  }

  // If another model was loaded, unload it first to save VRAM
  if (activeEngine) {
    try {
      await activeEngine.unload?.();
    } catch {
      // Ignore unload errors
    }
    activeEngine = null;
    currentLoadedModelId = null;
  }

  if (onProgress) {
    onProgress({
      progress: 0.05,
      text: 'Đang kết nối thư viện WebGPU (WebLLM)...',
      isLoaded: false,
    });
  }

  try {
    // Dynamically import WebLLM from high-speed CDN at runtime to keep Next.js bundle ultra-lean
    const dynamicImport = new Function('url', 'return import(url)') as (
      url: string
    ) => Promise<unknown>;
    const webllm = (await dynamicImport(
      'https://esm.run/@mlc-ai/web-llm@0.2.86'
    )) as unknown as WebLLMModule;

    if (!webllm || typeof webllm.CreateMLCEngine !== 'function') {
      throw new Error('Không thể tải module WebLLM từ CDN.');
    }

    const engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        if (onProgress) {
          onProgress({
            progress: report.progress,
            text: report.text,
            isLoaded: report.progress >= 1.0,
          });
        }
      },
    });

    activeEngine = engine;
    currentLoadedModelId = modelId;

    if (onProgress) {
      onProgress({
        progress: 1.0,
        text: 'Mô hình WebGPU đã nạp thành công vào VRAM!',
        isLoaded: true,
      });
    }

    return engine;
  } catch (err) {
    if (onProgress) {
      onProgress({
        progress: 0,
        text: `Lỗi nạp WebGPU: ${String(err)}`,
        isLoaded: false,
      });
    }
    throw err;
  }
}

/**
 * Translate a single text string using the in-browser WebGPU model
 */
export async function translateSingleWithWebGPU(
  maskedText: string,
  options: {
    modelId?: string;
    targetLang: string;
    toneInstruction?: string;
    glossary?: GlossaryItem[];
    speakerGuideline?: string;
  }
): Promise<string> {
  const stripped = maskedText.trim();
  if (OFFLINE_SENTENCE_CATALOG[stripped]) {
    return OFFLINE_SENTENCE_CATALOG[stripped];
  }

  const modelId = options.modelId || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  let engine = activeEngine;

  if (!engine || currentLoadedModelId !== modelId) {
    engine = await loadWebGPUModel(modelId);
  }

  const glossaryPrompt =
    options.glossary && options.glossary.length > 0
      ? `BẢNG THUẬT NGỮ BẮT BUỘC:\n` +
        options.glossary.map((g) => `- "${g.term}" => "${g.translation}"`).join('\n')
      : '';

  const systemPrompt = `Bạn là MÁY DỊCH THUẬT GAME TỰ ĐỘNG chuyên nghiệp sang tiếng Việt (${options.targetLang}).
QUY TẮC BẮT BUỘC:
1. BẮT BUỘC DỊCH SANG TIẾNG VIỆT 100%. TUYỆT ĐỐI CẤM DỊCH SANG TIẾNG TRUNG (Không được xuất hiện chữ Hán / Chinese characters).
2. CHỈ xuất ra câu dịch tương đương. TUYỆT ĐỐI CẤM giải thích ý nghĩa, CẤM định nghĩa từ, CẤM bịa thêm truyện.
3. Với nút bấm/tùy chọn ngắn (ví dụ: "Accept Quest", "Decline"), CHỈ dịch từ ngữ tương đương (ví dụ: "Nhận Nhiệm Vụ", "Từ Chối"). CẤM viết định nghĩa dài dòng.
4. BẢO TỒN THẺ: Giữ nguyên các thẻ bảo vệ dạng ⟦TAG_0⟧, ⟦TAG_1⟧ đúng vị trí trong câu dịch.
5. ${options.toneInstruction || 'Văn phong game tự nhiên, súc tích.'}
${options.speakerGuideline ? `6. ĐẠI TỪ XƯNG HÔ: ${options.speakerGuideline}` : ''}
${glossaryPrompt}`;

  const response = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Dịch text game: "New Game"' },
      { role: 'assistant', content: 'Trò Chơi Mới' },
      { role: 'user', content: 'Dịch text game: "Accept Quest"' },
      { role: 'assistant', content: 'Nhận Nhiệm Vụ' },
      { role: 'user', content: 'Dịch text game: "Decline"' },
      { role: 'assistant', content: 'Từ Chối' },
      { role: 'user', content: 'Dịch text game: "A loyal royal knight"' },
      { role: 'assistant', content: 'Một hiệp sĩ hoàng gia trung thành' },
      { role: 'user', content: `Dịch text game: "${maskedText}"` },
    ],
    temperature: 0.1,
    max_tokens: 256,
  });

  const reply = response.choices?.[0]?.message?.content?.trim() || maskedText;
  const sanitized = sanitizeAndValidateTranslation(maskedText, reply, [], options.targetLang);

  if (sanitized.isHallucinated) {
    throw new Error(`WebGPU hallucination detected: ${sanitized.reason || 'text invalid'}`);
  }

  return sanitized.cleanedText;
}

/**
 * Free WebGPU memory when needed
 */
export async function releaseWebGPU(): Promise<void> {
  if (activeEngine) {
    try {
      await activeEngine.unload?.();
    } catch {
      // Ignore
    }
    activeEngine = null;
    currentLoadedModelId = null;
  }
}
