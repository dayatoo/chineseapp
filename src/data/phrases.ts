import data from '../../data/phrases.json';

export type Phrase = {
  /** The phrase in simplified Chinese, with punctuation. Also its id for progress. */
  zh: string;
  pinyin: string;
  en: string;
};

export type PhraseTopic = { id: string; name: string; emoji: string; phrases: Phrase[] };

/** Hand-picked everyday phrases, grouped by topic and ordered from short to long. */
export const PHRASE_TOPICS: PhraseTopic[] = data.topics;

export const getPhraseTopic = (id: string) => PHRASE_TOPICS.find((t) => t.id === id) ?? null;

const isHan = (c: string) => /\p{Script=Han}/u.test(c);

/** One character to write, with any punctuation that follows it (e.g. "好" + "！"). */
export type PhraseCell = { char: string; trailing: string };

/** Splits a phrase into the characters to write. Leading punctuation is dropped. */
export function phraseCells(zh: string): PhraseCell[] {
  const cells: PhraseCell[] = [];
  for (const c of zh) {
    if (isHan(c)) cells.push({ char: c, trailing: '' });
    else if (cells.length) cells[cells.length - 1].trailing += c;
  }
  return cells;
}
