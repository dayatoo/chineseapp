/**
 * @jest-environment node
 */
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { getPhraseTopic, PHRASE_TOPICS, phraseCells } from '../phrases';

describe('phraseCells', () => {
  it('attaches punctuation to the character before it', () => {
    expect(phraseCells('你好，我叫小明。')).toEqual([
      { char: '你', trailing: '' },
      { char: '好', trailing: '，' },
      { char: '我', trailing: '' },
      { char: '叫', trailing: '' },
      { char: '小', trailing: '' },
      { char: '明', trailing: '。' },
    ]);
  });

  it('drops leading punctuation', () => {
    expect(phraseCells('“好！”')).toEqual([{ char: '好', trailing: '！”' }]);
  });
});

describe('phrase data', () => {
  const sqlite = new DatabaseSync(path.join(__dirname, '../../../assets/db/hanzi.db'), {
    readOnly: true,
  });
  const phrases = PHRASE_TOPICS.flatMap((t) => t.phrases);

  it('has unique topic ids and phrases', () => {
    const ids = PHRASE_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const zh = phrases.map((p) => p.zh);
    expect(new Set(zh).size).toBe(zh.length);
    expect(getPhraseTopic('greetings')?.phrases[0].zh).toBe('你好！');
  });

  it('fills in pinyin and English for every phrase', () => {
    for (const p of phrases) {
      expect(p.pinyin.trim()).not.toBe('');
      expect(p.en.trim()).not.toBe('');
    }
  });

  it('only uses characters with stroke data, at most 10 per phrase', () => {
    const lookup = sqlite.prepare('SELECT 1 FROM characters WHERE char = ?');
    for (const p of phrases) {
      const cells = phraseCells(p.zh);
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThanOrEqual(10);
      const missing = cells.filter((c) => !lookup.get(c.char)).map((c) => c.char);
      expect({ phrase: p.zh, missing }).toEqual({ phrase: p.zh, missing: [] });
    }
  });
});
