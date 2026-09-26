#!/usr/bin/env node
/**
 * Builds assets/db/hanzi.db, the read-only character database shipped with the app.
 *
 * Sources:
 *   - hanzi-writer-data (npm)            stroke outlines + medians   (Arphic Public License)
 *   - data/raw/dictionary.txt            pinyin, definition, radical  (Make Me a Hanzi, LGPL/APL)
 *   - data/raw/hsk-complete.min.json     HSK 3.0 levels + frequency   (complete-hsk-vocabulary, MIT)
 *   - data/topics.json                   hand-curated topic lists
 *
 * Run `npm run fetch-data` first to download the raw files, then `npm run build-db`.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { deflateSync, strToU8 } from 'fflate';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strokeDir = dirname(require.resolve('hanzi-writer-data/package.json'));
const outPath = join(root, 'assets/db/hanzi.db');

const stripTones = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isHan = (c) => /\p{Script=Han}/u.test(c) && c.codePointAt(0) >= 0x4e00;

function loadDictionary() {
  const dict = new Map();
  const lines = readFileSync(join(root, 'data/raw/dictionary.txt'), 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    dict.set(entry.character, entry);
  }
  return dict;
}

/** HSK 3.0 level ("n1".."n7", where 7 means 7–9) of the earliest word containing each character. */
function loadHsk() {
  const words = JSON.parse(readFileSync(join(root, 'data/raw/hsk-complete.min.json'), 'utf8'));
  const level = new Map();
  const freq = new Map();
  const single = new Map();
  for (const w of words) {
    const newLevels = w.l.filter((l) => l.startsWith('n')).map((l) => Number(l.slice(1)));
    if (newLevels.length) {
      const lvl = Math.min(...newLevels);
      for (const c of w.s) {
        if (!level.has(c) || level.get(c) > lvl) level.set(c, lvl);
      }
    }
    for (const c of w.s) {
      if (typeof w.q === 'number' && (!freq.has(c) || freq.get(c) > w.q)) freq.set(c, w.q);
    }
    if ([...w.s].length === 1) single.set(w.s, w);
  }
  return { level, freq, single };
}

function main() {
  const dict = loadDictionary();
  const hsk = loadHsk();
  const topics = JSON.parse(readFileSync(join(root, 'data/topics.json'), 'utf8'));

  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) rmSync(outPath);
  const db = new DatabaseSync(outPath);
  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE characters (
      char TEXT PRIMARY KEY NOT NULL,
      data BLOB NOT NULL, -- raw-deflated JSON {"s": stroke paths, "m": medians}
      pinyin TEXT NOT NULL,
      pinyin_plain TEXT NOT NULL, -- tone marks removed, for search ("shui")
      meaning TEXT NOT NULL,
      radical TEXT,
      stroke_count INTEGER NOT NULL,
      hsk_level INTEGER,
      freq INTEGER
    );
    CREATE TABLE topics (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      sort INTEGER NOT NULL
    );
    CREATE TABLE topic_chars (
      topic_id TEXT NOT NULL,
      char TEXT NOT NULL,
      pos INTEGER NOT NULL,
      PRIMARY KEY (topic_id, char)
    );
  `);

  const insertChar = db.prepare(
    `INSERT INTO characters (char, data, pinyin, pinyin_plain, meaning, radical, stroke_count, hsk_level, freq)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let count = 0;
  db.exec('BEGIN');
  for (const file of readdirSync(strokeDir)) {
    if (!file.endsWith('.json') || file === 'package.json') continue;
    const char = file.slice(0, -5);
    if ([...char].length !== 1 || !isHan(char)) continue;
    const entry = dict.get(char);
    if (!entry || !entry.pinyin?.length) continue;

    const data = JSON.parse(readFileSync(join(strokeDir, file), 'utf8'));
    if (data.strokes.length !== data.medians.length) continue;

    const hskWord = hsk.single.get(char);
    // Prefer the HSK reading (the common one), skipping capitalised proper-noun readings like "Shuǐ".
    const hskReadings = (hskWord?.f ?? []).map((f) => f.i.y).filter((p) => p === p.toLowerCase());
    const dictReadings = entry.pinyin.filter((p) => p === p.toLowerCase());
    const readings = [...new Set([...hskReadings, ...dictReadings])];
    if (!readings.length) readings.push(entry.pinyin[0].toLowerCase());
    const meaning = entry.definition ?? hskWord?.f?.[0]?.m?.join('; ') ?? '';

    insertChar.run(
      char,
      deflateSync(strToU8(JSON.stringify({ s: data.strokes, m: data.medians })), { level: 9 }),
      readings.join(', '),
      stripTones(readings.join(', ')),
      meaning,
      entry.radical ?? null,
      data.strokes.length,
      hsk.level.get(char) ?? null,
      hsk.freq.get(char) ?? null,
    );
    count++;
  }

  const insertTopic = db.prepare('INSERT INTO topics (id, name, emoji, sort) VALUES (?, ?, ?, ?)');
  const insertTopicChar = db.prepare(
    'INSERT OR IGNORE INTO topic_chars (topic_id, char, pos) VALUES (?, ?, ?)',
  );
  const hasChar = db.prepare('SELECT 1 FROM characters WHERE char = ?');
  topics.forEach((topic, i) => {
    insertTopic.run(topic.id, topic.name, topic.emoji, i);
    [...topic.chars].forEach((c, pos) => {
      if (!hasChar.get(c)) throw new Error(`Topic "${topic.id}" uses unknown character ${c}`);
      insertTopicChar.run(topic.id, c, pos);
    });
  });
  db.exec('COMMIT');

  db.exec(`
    CREATE INDEX idx_characters_hsk ON characters (hsk_level);
    CREATE INDEX idx_characters_freq ON characters (freq);
    VACUUM;
  `);
  db.close();
  console.log(`Wrote ${count} characters and ${topics.length} topics to ${outPath}`);
}

main();
