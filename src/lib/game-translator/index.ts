/**
 * Game Translator - Public API Facade
 */

export * from './types';
export * from './tag-guard';
export * from './detector';
export * from './translator';
export * from './packager';
export * from './sample-data';
export * from './adapters/rpgmaker';
export * from './adapters/renpy';
export * from './adapters/unity';
export * from './webgpu-translator';
export * from './python-bridge';
export * from './catalog';
export * from './sanitizer';
export * from './speaker-analyzer';

import {
  EngineDetectionResult,
  TranslatableSegment,
  ParsedGameProject,
} from './types';
import { detectGameEngine } from './detector';
import {
  extractRPGMakerSegments,
  injectRPGMakerTranslations,
} from './adapters/rpgmaker';
import {
  extractRenpySegments,
  injectRenpyTranslations,
  generateRenpyTranslationFile,
} from './adapters/renpy';
import {
  extractUnityKeyValueSegments,
  injectUnityKeyValueTranslations,
  extractGenericJsonSegments,
  injectGenericJsonTranslations,
} from './adapters/unity';
import { buildZipArchive } from './packager';
import { extractUniqueSpeakers, heuristicAnalyzeSpeaker } from './speaker-analyzer';

/**
 * High-level project parser: Ingests raw files and returns recognized project
 */
export function parseGameProject(
  projectName: string,
  rawFiles: { name: string; path: string; content: string; size: number }[]
): ParsedGameProject {
  const fileDescriptors = rawFiles.map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    sampleContent: f.content.slice(0, 1500),
  }));

  const engine = detectGameEngine(fileDescriptors);
  const segments: TranslatableSegment[] = [];

  for (const file of rawFiles) {
    if (engine.engine === 'rpg_maker_mvmz') {
      const segs = extractRPGMakerSegments(file.path, file.content);
      segments.push(...segs);
    } else if (engine.engine === 'renpy') {
      const segs = extractRenpySegments(file.path, file.content);
      segments.push(...segs);
    } else if (engine.engine === 'unity_localization') {
      const segs = extractUnityKeyValueSegments(file.path, file.content);
      segments.push(...segs);
    } else if (file.name.endsWith('.json')) {
      const segs = extractGenericJsonSegments(file.path, file.content);
      segments.push(...segs);
    } else {
      const segs = extractUnityKeyValueSegments(file.path, file.content);
      segments.push(...segs);
    }
  }

  const defaultTone = engine.engine === 'renpy' ? 'visual_novel' : 'fantasy_rpg';
  const speakerGroups = extractUniqueSpeakers(segments);
  const personas = speakerGroups.map((g) => heuristicAnalyzeSpeaker(g.speaker, g.sampleQuotes, defaultTone));

  return {
    id: `proj_${Date.now()}`,
    name: projectName,
    engine,
    files: rawFiles.map((f) => ({
      name: f.path,
      rawContent: f.content,
      size: f.size,
    })),
    segments,
    personas,
  };
}

/**
 * Package translated project into game-ready files
 */
export function exportTranslatedPatch(
  project: ParsedGameProject,
  segments: TranslatableSegment[]
): { path: string; content: string }[] {
  const resultFiles: { path: string; content: string }[] = [];

  for (const originalFile of project.files) {
    const fileSegments = segments.filter((s) => s.file === originalFile.name);

    if (project.engine.engine === 'rpg_maker_mvmz') {
      const modified = injectRPGMakerTranslations(originalFile.rawContent, fileSegments);
      resultFiles.push({ path: originalFile.name, content: modified });
    } else if (project.engine.engine === 'renpy') {
      // 1. In-place modified script
      const modified = injectRenpyTranslations(originalFile.rawContent, fileSegments);
      resultFiles.push({ path: originalFile.name, content: modified });

      // 2. Also generate game/tl/vietnamese/ companion file
      const tlContent = generateRenpyTranslationFile('vietnamese', fileSegments);
      const baseName = originalFile.name.split('/').pop() || 'script.rpy';
      resultFiles.push({
        path: `game/tl/vietnamese/${baseName}`,
        content: tlContent,
      });
    } else if (project.engine.engine === 'unity_localization') {
      const modified = injectUnityKeyValueTranslations(originalFile.rawContent, fileSegments);
      resultFiles.push({ path: originalFile.name, content: modified });
    } else if (originalFile.name.endsWith('.json')) {
      const modified = injectGenericJsonTranslations(originalFile.rawContent, fileSegments);
      resultFiles.push({ path: originalFile.name, content: modified });
    } else {
      const modified = injectUnityKeyValueTranslations(originalFile.rawContent, fileSegments);
      resultFiles.push({ path: originalFile.name, content: modified });
    }
  }

  return resultFiles;
}

/**
 * Generate binary ZIP archive ready to download
 */
export function generatePatchZip(
  project: ParsedGameProject,
  segments: TranslatableSegment[]
): Uint8Array {
  const exportedFiles = exportTranslatedPatch(project, segments);
  return buildZipArchive(exportedFiles);
}
