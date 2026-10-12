/**
 * Python Accelerator Bridge
 * Connects Next.js to the high-performance local Python sidecar server.
 */

import { GlossaryItem, PythonEngineStatus } from './types';

export const DEFAULT_PYTHON_SERVER_URL = 'http://127.0.0.1:8765';

/**
 * Check if the Python sidecar server is running and get its hardware status
 */
export async function checkPythonEngineStatus(
  url: string = DEFAULT_PYTHON_SERVER_URL
): Promise<PythonEngineStatus> {
  try {
    const res = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      return {
        online: false,
        url,
        error: `Máy chủ Python phản hồi mã lỗi: ${res.status}`,
      };
    }

    const data = (await res.json()) as unknown;
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return {
        online: obj.status === 'online',
        url,
        version: typeof obj.version === 'string' ? obj.version : '1.0.0',
        pythonVersion: typeof obj.python_version === 'string' ? obj.python_version : undefined,
        hardware: typeof obj.hardware === 'string' ? obj.hardware : 'CPU Multi-Threading',
        processor: typeof obj.processor === 'string' ? obj.processor : undefined,
        activeWorkers: typeof obj.active_workers === 'number' ? obj.active_workers : 8,
      };
    }

    return { online: false, url, error: 'Dữ liệu phản hồi không hợp lệ.' };
  } catch (err) {
    return {
      online: false,
      url,
      error: `Chưa khởi chạy máy chủ Python. Chạy lệnh: python3 python-engine/server.py (${String(err)})`,
    };
  }
}

/**
 * Send batch of segments to Python for multi-threaded translation
 */
export async function translateWithPythonEngine(
  items: { id: string; text: string }[],
  options: {
    targetLang: string;
    glossary?: GlossaryItem[];
    url?: string;
  }
): Promise<Map<string, string>> {
  const url = options.url || DEFAULT_PYTHON_SERVER_URL;

  const payload = {
    segments: items,
    target_lang: options.targetLang,
    glossary: options.glossary || [],
  };

  const res = await fetch(`${url}/translate/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Python engine batch translate error: ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  const resultMap = new Map<string, string>();

  if (typeof data === 'object' && data !== null && 'results' in data) {
    const list = (data as { results: unknown[] }).results;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          const rec = item as Record<string, unknown>;
          if (typeof rec.id === 'string' && typeof rec.translation === 'string') {
            resultMap.set(rec.id, rec.translation);
          }
        }
      });
    }
  }

  return resultMap;
}

/**
 * Run a performance benchmark against the Python engine
 */
export async function runPythonBenchmark(
  sampleCount: number = 25,
  url: string = DEFAULT_PYTHON_SERVER_URL
): Promise<{
  throughput: number;
  durationMs: number;
  workers: number;
  hardware: string;
}> {
  const res = await fetch(`${url}/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_count: sampleCount }),
  });

  if (!res.ok) {
    throw new Error(`Benchmark error: ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  const obj = data as Record<string, unknown>;

  return {
    throughput: typeof obj.throughput_per_sec === 'number' ? obj.throughput_per_sec : 0,
    durationMs: typeof obj.duration_ms === 'number' ? obj.duration_ms : 0,
    workers: typeof obj.workers === 'number' ? obj.workers : 0,
    hardware: typeof obj.hardware === 'string' ? obj.hardware : 'CPU',
  };
}
