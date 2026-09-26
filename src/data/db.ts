import { inflateSync, strFromU8 } from 'fflate';

import type { CharacterData, CharacterInfo, Point, StrokeData, Topic } from './types';

/** Database file name on device. Bump the version whenever assets/db/hanzi.db is rebuilt. */
export const DATABASE_NAME = 'hanzi-v1.db';

/**
 * The subset of expo-sqlite's SQLiteDatabase used here, so the queries can also run against
 * node:sqlite in tests.
 */
export interface Queryable {
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: (string | number | null)[]): Promise<T | null>;
}

type InfoRow = {
  char: string;
  pinyin: string;
  meaning: string;
  radical: string | null;
  stroke_count: number;
  hsk_level: number | null;
  freq: number | null;
};

const INFO_COLUMNS = 'char, pinyin, meaning, radical, stroke_count, hsk_level, freq';

const toInfo = (row: InfoRow): CharacterInfo => ({
  char: row.char,
  pinyin: row.pinyin,
  meaning: row.meaning,
  radical: row.radical,
  strokeCount: row.stroke_count,
  hskLevel: row.hsk_level,
  freq: row.freq,
});

export function decodeStrokeData(blob: Uint8Array): StrokeData {
  const { s, m } = JSON.parse(strFromU8(inflateSync(blob))) as {
    s: string[];
    m: [number, number][][];
  };
  return {
    strokes: s,
    medians: m.map((median) => median.map(([x, y]): Point => ({ x, y }))),
  };
}

const characterCache = new Map<string, CharacterData>();

export async function getCharacter(db: Queryable, char: string): Promise<CharacterData | null> {
  const cached = characterCache.get(char);
  if (cached) return cached;
  const row = await db.getFirstAsync<InfoRow & { data: Uint8Array }>(
    `SELECT ${INFO_COLUMNS}, data FROM characters WHERE char = ?`,
    [char],
  );
  if (!row) return null;
  const character = { ...toInfo(row), ...decodeStrokeData(row.data) };
  characterCache.set(char, character);
  return character;
}

/** Looks up info for the given characters, preserving their order and skipping unknown ones. */
export async function getInfos(db: Queryable, chars: string[]): Promise<CharacterInfo[]> {
  if (!chars.length) return [];
  const rows = await db.getAllAsync<InfoRow>(
    `SELECT ${INFO_COLUMNS} FROM characters WHERE char IN (${chars.map(() => '?').join(',')})`,
    chars,
  );
  const byChar = new Map(rows.map((row) => [row.char, toInfo(row)]));
  return chars.flatMap((c) => byChar.get(c) ?? []);
}

export async function getTopics(db: Queryable): Promise<Topic[]> {
  return db.getAllAsync<Topic>('SELECT id, name, emoji FROM topics ORDER BY sort', []);
}

export async function getTopic(db: Queryable, id: string): Promise<Topic | null> {
  return db.getFirstAsync<Topic>('SELECT id, name, emoji FROM topics WHERE id = ?', [id]);
}

export async function getTopicInfos(db: Queryable, topicId: string): Promise<CharacterInfo[]> {
  const rows = await db.getAllAsync<InfoRow>(
    `SELECT ${INFO_COLUMNS.split(', ')
      .map((c) => `c.${c}`)
      .join(', ')}
     FROM topic_chars t JOIN characters c ON c.char = t.char
     WHERE t.topic_id = ? ORDER BY t.pos`,
    [topicId],
  );
  return rows.map(toInfo);
}

export async function getHskInfos(db: Queryable, level: number): Promise<CharacterInfo[]> {
  const rows = await db.getAllAsync<InfoRow>(
    `SELECT ${INFO_COLUMNS} FROM characters WHERE hsk_level = ?`,
    [level],
  );
  return rows.map(toInfo);
}

/** Extracts the unique Chinese characters from free text, in order of first appearance. */
export function extractHanzi(text: string): string[] {
  return [...new Set(text.match(/\p{Script=Han}/gu) ?? [])];
}

/**
 * Searches by character(s), pinyin (with or without tone marks) or English meaning.
 * Common characters are listed first.
 */
export async function searchCharacters(
  db: Queryable,
  query: string,
  limit = 60,
): Promise<CharacterInfo[]> {
  const q = query.trim();
  if (!q) return [];
  const hanzi = extractHanzi(q);
  if (hanzi.length) return getInfos(db, hanzi);

  const plain = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[1-5]/g, '');
  const rows = await db.getAllAsync<InfoRow>(
    `SELECT ${INFO_COLUMNS} FROM characters
     WHERE (', ' || pinyin_plain || ',') LIKE ? OR meaning LIKE ?
     ORDER BY
       CASE
         WHEN (', ' || pinyin || ',') LIKE ? THEN 0
         WHEN (', ' || pinyin_plain || ',') LIKE ? THEN 1
         ELSE 2
       END,
       freq IS NULL, freq, stroke_count
     LIMIT ?`,
    [`%, ${plain},%`, `%${q}%`, `%, ${q.toLowerCase()},%`, `%, ${plain},%`, limit],
  );
  return rows.map(toInfo);
}
