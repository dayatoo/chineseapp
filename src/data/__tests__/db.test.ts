/**
 * @jest-environment node
 */
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  extractHanzi,
  getCharacter,
  getHskInfos,
  getInfos,
  getTopicInfos,
  getTopics,
  type Queryable,
  searchCharacters,
} from '../db';

const sqlite = new DatabaseSync(path.join(__dirname, '../../../assets/db/hanzi.db'), {
  readOnly: true,
});

/** Adapts node:sqlite to the async subset of expo-sqlite used by the app. */
const db: Queryable = {
  async getAllAsync<T>(sql: string, params: (string | number | null)[]) {
    return sqlite.prepare(sql).all(...params) as T[];
  },
  async getFirstAsync<T>(sql: string, params: (string | number | null)[]) {
    return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
  },
};

describe('character database', () => {
  it('contains the full Make Me a Hanzi set', () => {
    const { n } = sqlite.prepare('SELECT count(*) AS n FROM characters').get() as { n: number };
    expect(n).toBeGreaterThan(9000);
  });

  it('decodes stroke data with matching stroke and median counts', async () => {
    const shui = await getCharacter(db, '水');
    expect(shui).toMatchObject({ char: '水', pinyin: 'shuǐ', strokeCount: 4, hskLevel: 1 });
    expect(shui!.strokes).toHaveLength(4);
    expect(shui!.medians).toHaveLength(4);
    expect(shui!.medians[0][0]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('has stroke data for every HSK 1 character', async () => {
    const infos = await getHskInfos(db, 1);
    expect(infos.length).toBeGreaterThanOrEqual(290);
    for (const info of infos) {
      const c = await getCharacter(db, info.char);
      expect(c!.strokes.length).toBe(c!.medians.length);
      expect(c!.strokes.length).toBe(info.strokeCount);
    }
  });

  it('lists topics with their characters in order', async () => {
    const topics = await getTopics(db);
    expect(topics[0]).toEqual({ id: 'numbers', name: 'Numbers', emoji: '🔢' });
    const numbers = await getTopicInfos(db, 'numbers');
    expect(numbers.slice(0, 3).map((i) => i.char)).toEqual(['一', '二', '三']);
  });

  it('looks up pasted characters in order and skips unknown ones', async () => {
    expect(extractHanzi('我爱你, I love you! 我')).toEqual(['我', '爱', '你']);
    const infos = await getInfos(db, ['你', '我', '𠀀']);
    expect(infos.map((i) => i.char)).toEqual(['你', '我']);
  });

  it('searches by pinyin with or without tones, and by meaning', async () => {
    expect((await searchCharacters(db, 'shui')).map((i) => i.char)).toContain('水');
    expect((await searchCharacters(db, 'shuǐ'))[0].char).toBe('水');
    expect((await searchCharacters(db, 'shui3')).map((i) => i.char)).toContain('水');
    expect((await searchCharacters(db, 'water')).map((i) => i.char)).toContain('水');
    expect((await searchCharacters(db, '水')).map((i) => i.char)).toEqual(['水']);
  });
});
