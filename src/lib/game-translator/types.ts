/**
 * Game Translation Platform - Core Types
 * Strictly zero 'any' - using discriminated unions and type narrowing.
 */

export type GameEngineType =
  | 'rpg_maker_mvmz'
  | 'renpy'
  | 'unity_localization'
  | 'godot'
  | 'generic_json'
  | 'generic_text'
  | 'unknown';

export interface TranslatableSegment {
  id: string;
  file: string;
  original: string;
  translation: string;
  speaker?: string;
  context?: string;
  status: 'untranslated' | 'translated' | 'reviewed';
  tags: string[];
  meta: Record<string, unknown>;
}

export interface EngineDetectionResult {
  engine: GameEngineType;
  confidence: number; // 0.0 to 1.0
  name: string;
  version?: string;
  description: string;
  matchedFiles: string[];
  suggestedEncoding: string;
  detectedTags: string[];
  reason: string;
}

export interface GlossaryItem {
  id: string;
  term: string;
  translation: string;
  category: 'character' | 'location' | 'item' | 'skill' | 'general';
}

export type TranslationTone =
  | 'fantasy_rpg'
  | 'visual_novel'
  | 'game_casual'
  | 'wuxia'
  | 'sci_fi';

export type AIProvider =
  | 'web_free'
  | 'python_local'
  | 'webgpu'
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'ollama'
  | 'mock';

export interface PythonEngineStatus {
  online: boolean;
  url: string;
  version?: string;
  pythonVersion?: string;
  hardware?: string;
  processor?: string;
  activeWorkers?: number;
  error?: string;
}

export interface WebGPUStatus {
  supported: boolean;
  adapterName?: string;
  vendor?: string;
  architecture?: string;
  error?: string;
}

export interface WebGPUModelProgress {
  progress: number;
  text: string;
  isLoaded: boolean;
}

export interface SpeakerPersona {
  speaker: string;
  role: string;
  gender: 'male' | 'female' | 'neutral' | 'unknown';
  ageGroup: 'child' | 'young' | 'adult' | 'elder';
  firstPerson: string;
  secondPerson: string;
  relationship?: string;
  toneInstruction?: string;
}

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  sourceLang: string;
  targetLang: string;
  tone: TranslationTone;
  glossary: GlossaryItem[];
  personas?: SpeakerPersona[];
}

export interface ParsedGameProject {
  id: string;
  name: string;
  engine: EngineDetectionResult;
  files: {
    name: string;
    rawContent: string;
    size: number;
  }[];
  segments: TranslatableSegment[];
  personas?: SpeakerPersona[];
}
