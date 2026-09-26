import type { CharacterInfo } from './types';

export const LESSON_SIZE = 8;

export type Lesson = { id: string; title: string; chars: string[] };
export type Tier = { name: string; lessons: Lesson[] };

const TIER_NAMES = ['Beginner', 'Intermediate', 'Advanced'];

/** Easier first: fewer strokes, then more common. */
export function sortByDifficulty(infos: CharacterInfo[]): CharacterInfo[] {
  return [...infos].sort(
    (a, b) =>
      a.strokeCount - b.strokeCount ||
      (a.freq ?? Number.MAX_SAFE_INTEGER) - (b.freq ?? Number.MAX_SAFE_INTEGER) ||
      a.char.localeCompare(b.char),
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Sorts a category's characters by difficulty, splits them into three tiers of (roughly)
 * equal size, and chunks each tier into lessons of LESSON_SIZE characters.
 *
 * Lesson ids look like `<categoryId>.<tier>.<lesson>`, e.g. `hsk-1.0.2`.
 */
export function buildTiers(categoryId: string, infos: CharacterInfo[]): Tier[] {
  const sorted = sortByDifficulty(infos).map((info) => info.char);
  const tierCount = Math.min(TIER_NAMES.length, Math.ceil(sorted.length / LESSON_SIZE));
  const tierSize = Math.ceil(sorted.length / tierCount);

  return chunk(sorted, tierSize).map((tierChars, t) => ({
    name: TIER_NAMES[t],
    lessons: chunk(tierChars, LESSON_SIZE).map((chars, l) => ({
      id: `${categoryId}.${t}.${l}`,
      title: `Lesson ${l + 1}`,
      chars,
    })),
  }));
}

export type LessonRef =
  | { kind: 'topic'; topicId: string; tier: number; lesson: number }
  | { kind: 'hsk'; level: number; tier: number; lesson: number }
  | { kind: 'custom'; setId: string }
  | { kind: 'review' }
  | { kind: 'chars'; chars: string[] };

export type CategoryRef = { kind: 'topic'; topicId: string } | { kind: 'hsk'; level: number };

export const categoryId = (ref: CategoryRef) =>
  ref.kind === 'topic' ? `topic-${ref.topicId}` : `hsk-${ref.level}`;

export function parseCategoryId(id: string): CategoryRef | null {
  const topic = /^topic-([a-z0-9_]+)$/.exec(id);
  if (topic) return { kind: 'topic', topicId: topic[1] };
  const hsk = /^hsk-([1-7])$/.exec(id);
  if (hsk) return { kind: 'hsk', level: Number(hsk[1]) };
  return null;
}

/**
 * Lesson ids used in routes:
 *   topic-<id>.<tier>.<lesson>   hsk-<level>.<tier>.<lesson>
 *   custom-<setId>               review               chars-<characters>
 */
export function parseLessonId(id: string): LessonRef | null {
  if (id === 'review') return { kind: 'review' };
  if (id.startsWith('custom-')) return { kind: 'custom', setId: id.slice('custom-'.length) };
  if (id.startsWith('chars-')) {
    const chars = [...id.slice('chars-'.length)];
    return chars.length ? { kind: 'chars', chars } : null;
  }
  const m = /^(.+)\.(\d+)\.(\d+)$/.exec(id);
  if (!m) return null;
  const category = parseCategoryId(m[1]);
  if (!category) return null;
  return { ...category, tier: Number(m[2]), lesson: Number(m[3]) };
}

export const HSK_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export const hskName = (level: number) => (level === 7 ? 'HSK 7–9' : `HSK ${level}`);
