/**
 * RPG Maker MV / MZ Parser & Re-injector
 * Strictly zero 'any' - robustly traverses JSON AST without corrupting events.
 */

import { TranslatableSegment } from '../types';
import { extractGameTags } from '../tag-guard';

interface RPGMakerEventCommand {
  code: number;
  indent?: number;
  parameters: unknown[];
}

interface RPGMakerEventPage {
  list?: RPGMakerEventCommand[];
}

interface RPGMakerEvent {
  id?: number;
  name?: string;
  pages?: RPGMakerEventPage[];
}

interface RPGMakerMapJson {
  displayName?: string;
  events?: (RPGMakerEvent | null)[];
}

interface RPGMakerDatabaseItem {
  id?: number;
  name?: string;
  description?: string;
  profile?: string;
  nickname?: string;
}

/**
 * Extract translatable segments from an RPG Maker MV/MZ JSON file
 */
export function extractRPGMakerSegments(
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

  if (typeof data !== 'object' || data === null) {
    return segments;
  }

  // Case 1: Map file (data/MapXXX.json)
  const mapData = data as RPGMakerMapJson;
  if (Array.isArray(mapData.events)) {
    if (mapData.displayName && typeof mapData.displayName === 'string' && mapData.displayName.trim()) {
      segments.push({
        id: `${fileName}:map_display_name`,
        file: fileName,
        original: mapData.displayName,
        translation: '',
        context: 'Map Display Name',
        status: 'untranslated',
        tags: extractGameTags(mapData.displayName),
        meta: { path: ['displayName'] },
      });
    }

    mapData.events.forEach((event, eventIdx) => {
      if (!event || !Array.isArray(event.pages)) return;

      const eventName = event.name || `Event_${event.id || eventIdx}`;

      event.pages.forEach((page, pageIdx) => {
        if (!Array.isArray(page.list)) return;

        page.list.forEach((cmd, cmdIdx) => {
          // Code 401: Show Text (Dialogue line)
          if (cmd.code === 401 && Array.isArray(cmd.parameters) && typeof cmd.parameters[0] === 'string') {
            const line = cmd.parameters[0];
            if (line.trim().length > 0) {
              segments.push({
                id: `${fileName}:ev_${eventIdx}:p_${pageIdx}:c_${cmdIdx}`,
                file: fileName,
                original: line,
                translation: '',
                speaker: eventName,
                context: `Hội thoại Sự kiện [${eventName}] Trang ${pageIdx + 1}`,
                status: 'untranslated',
                tags: extractGameTags(line),
                meta: {
                  type: 'event_command',
                  eventIdx,
                  pageIdx,
                  cmdIdx,
                  paramIdx: 0,
                },
              });
            }
          }

          // Code 102: Show Choices
          if (cmd.code === 102 && Array.isArray(cmd.parameters) && Array.isArray(cmd.parameters[0])) {
            const choices = cmd.parameters[0] as unknown[];
            choices.forEach((choice, choiceIdx) => {
              if (typeof choice === 'string' && choice.trim().length > 0) {
                segments.push({
                  id: `${fileName}:ev_${eventIdx}:p_${pageIdx}:c_${cmdIdx}:ch_${choiceIdx}`,
                  file: fileName,
                  original: choice,
                  translation: '',
                  speaker: eventName,
                  context: `Lựa chọn [${choiceIdx + 1}] trong Sự kiện [${eventName}]`,
                  status: 'untranslated',
                  tags: extractGameTags(choice),
                  meta: {
                    type: 'choice_command',
                    eventIdx,
                    pageIdx,
                    cmdIdx,
                    choiceIdx,
                  },
                });
              }
            });
          }
        });
      });
    });

    return segments;
  }

  // Case 2: Array of Database Items (Actors, Items, Skills, Weapons, Armors, Enemies)
  if (Array.isArray(data)) {
    const items = data as (RPGMakerDatabaseItem | null)[];
    items.forEach((item, itemIdx) => {
      if (!item) return;

      if (typeof item.name === 'string' && item.name.trim().length > 0) {
        segments.push({
          id: `${fileName}:item_${itemIdx}:name`,
          file: fileName,
          original: item.name,
          translation: '',
          context: `Tên vật phẩm/kỹ năng/nhân vật ID #${item.id ?? itemIdx}`,
          status: 'untranslated',
          tags: extractGameTags(item.name),
          meta: { itemIdx, field: 'name' },
        });
      }

      if (typeof item.description === 'string' && item.description.trim().length > 0) {
        segments.push({
          id: `${fileName}:item_${itemIdx}:desc`,
          file: fileName,
          original: item.description,
          translation: '',
          context: `Mô tả ID #${item.id ?? itemIdx}`,
          status: 'untranslated',
          tags: extractGameTags(item.description),
          meta: { itemIdx, field: 'description' },
        });
      }

      if (typeof item.profile === 'string' && item.profile.trim().length > 0) {
        segments.push({
          id: `${fileName}:item_${itemIdx}:profile`,
          file: fileName,
          original: item.profile,
          translation: '',
          speaker: typeof item.name === 'string' && item.name.trim().length > 0 ? item.name : undefined,
          context: `Tiểu sử nhân vật ID #${item.id ?? itemIdx}`,
          status: 'untranslated',
          tags: extractGameTags(item.profile),
          meta: { itemIdx, field: 'profile' },
        });
      }
    });

    return segments;
  }

  // Case 3: System.json
  const sysObj = data as Record<string, unknown>;
  if ('gameTitle' in sysObj && typeof sysObj.gameTitle === 'string') {
    segments.push({
      id: `${fileName}:gameTitle`,
      file: fileName,
      original: sysObj.gameTitle,
      translation: '',
      context: 'Tiêu đề trò chơi (Game Title)',
      status: 'untranslated',
      tags: extractGameTags(sysObj.gameTitle),
      meta: { path: ['gameTitle'] },
    });
  }

  return segments;
}

/**
 * Re-inject translated segments back into RPG Maker JSON without breaking structure
 */
export function injectRPGMakerTranslations(
  rawJson: string,
  segments: TranslatableSegment[]
): string {
  const transMap = new Map<string, string>();
  for (const s of segments) {
    if (s.translation.trim().length > 0) {
      transMap.set(s.id, s.translation);
    }
  }

  let data: unknown;
  try {
    data = JSON.parse(rawJson) as unknown;
  } catch {
    return rawJson;
  }

  if (typeof data !== 'object' || data === null) {
    return rawJson;
  }

  // Clone object
  const cloned = JSON.parse(JSON.stringify(data)) as unknown;

  // Apply to Map
  const mapData = cloned as RPGMakerMapJson;
  if (Array.isArray(mapData.events)) {
    segments.forEach((seg) => {
      const trans = transMap.get(seg.id);
      if (!trans) return;

      const meta = seg.meta;
      if (meta.type === 'event_command') {
        const evIdx = meta.eventIdx as number;
        const pIdx = meta.pageIdx as number;
        const cIdx = meta.cmdIdx as number;
        const ev = mapData.events?.[evIdx];
        const page = ev?.pages?.[pIdx];
        const cmd = page?.list?.[cIdx];
        if (cmd && Array.isArray(cmd.parameters)) {
          cmd.parameters[0] = trans;
        }
      } else if (meta.type === 'choice_command') {
        const evIdx = meta.eventIdx as number;
        const pIdx = meta.pageIdx as number;
        const cIdx = meta.cmdIdx as number;
        const chIdx = meta.choiceIdx as number;
        const ev = mapData.events?.[evIdx];
        const page = ev?.pages?.[pIdx];
        const cmd = page?.list?.[cIdx];
        if (cmd && Array.isArray(cmd.parameters) && Array.isArray(cmd.parameters[0])) {
          (cmd.parameters[0] as unknown[])[chIdx] = trans;
        }
      }
    });

    return JSON.stringify(cloned, null, 2);
  }

  // Apply to Database Array
  if (Array.isArray(cloned)) {
    const list = cloned as (Record<string, unknown> | null)[];
    segments.forEach((seg) => {
      const trans = transMap.get(seg.id);
      if (!trans) return;

      const meta = seg.meta;
      if (typeof meta.itemIdx === 'number' && typeof meta.field === 'string') {
        const item = list[meta.itemIdx];
        if (item) {
          item[meta.field] = trans;
        }
      }
    });

    return JSON.stringify(cloned, null, 2);
  }

  // Apply to System.json
  const sysObj = cloned as Record<string, unknown>;
  segments.forEach((seg) => {
    const trans = transMap.get(seg.id);
    if (!trans) return;
    if (seg.id.endsWith(':gameTitle')) {
      sysObj.gameTitle = trans;
    }
  });

  return JSON.stringify(cloned, null, 2);
}
