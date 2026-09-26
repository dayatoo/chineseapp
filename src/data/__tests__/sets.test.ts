/**
 * @jest-environment node
 */
import { buildTiers, parseCategoryId, parseLessonId, sortByDifficulty } from '../sets';
import type { CharacterInfo } from '../types';

const info = (char: string, strokeCount: number, freq: number | null = null): CharacterInfo => ({
  char,
  strokeCount,
  freq,
  pinyin: '',
  meaning: '',
  radical: null,
  hskLevel: null,
});

describe('sortByDifficulty', () => {
  it('orders by stroke count, then frequency', () => {
    const sorted = sortByDifficulty([
      info('我', 7, 3),
      info('十', 2, 865),
      info('一', 1),
      info('人', 2, 10),
    ]);
    expect(sorted.map((i) => i.char)).toEqual(['一', '人', '十', '我']);
  });
});

describe('buildTiers', () => {
  it('splits into three tiers of lessons of up to 8', () => {
    const infos = Array.from({ length: 50 }, (_, i) =>
      info(String.fromCodePoint(0x4e00 + i), i + 1),
    );
    const tiers = buildTiers('hsk-1', infos);
    expect(tiers.map((t) => t.name)).toEqual(['Beginner', 'Intermediate', 'Advanced']);
    expect(tiers.flatMap((t) => t.lessons.flatMap((l) => l.chars))).toHaveLength(50);
    expect(tiers[0].lessons[0].chars[0]).toBe('一');
    expect(tiers[0].lessons[0].id).toBe('hsk-1.0.0');
    for (const tier of tiers)
      for (const lesson of tier.lessons) expect(lesson.chars.length).toBeLessThanOrEqual(8);
  });

  it('uses fewer tiers for small categories', () => {
    expect(buildTiers('topic-x', [info('一', 1), info('二', 2)])).toHaveLength(1);
    expect(
      buildTiers(
        'topic-x',
        Array.from({ length: 12 }, (_, i) => info(String(i), i)),
      ),
    ).toHaveLength(2);
  });
});

describe('lesson ids', () => {
  it('round-trips category and lesson ids', () => {
    expect(parseCategoryId('topic-numbers')).toEqual({ kind: 'topic', topicId: 'numbers' });
    expect(parseCategoryId('hsk-7')).toEqual({ kind: 'hsk', level: 7 });
    expect(parseCategoryId('hsk-9')).toBeNull();
    expect(parseLessonId('hsk-2.1.4')).toEqual({ kind: 'hsk', level: 2, tier: 1, lesson: 4 });
    expect(parseLessonId('topic-food.0.0')).toEqual({
      kind: 'topic',
      topicId: 'food',
      tier: 0,
      lesson: 0,
    });
    expect(parseLessonId('custom-abc123')).toEqual({ kind: 'custom', setId: 'abc123' });
    expect(parseLessonId('review')).toEqual({ kind: 'review' });
    expect(parseLessonId('chars-我爱你')).toEqual({ kind: 'chars', chars: ['我', '爱', '你'] });
    expect(parseLessonId('nonsense')).toBeNull();
  });
});
