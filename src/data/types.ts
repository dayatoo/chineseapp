export type Point = { x: number; y: number };

/** Everything about a character except its stroke geometry. */
export type CharacterInfo = {
  char: string;
  /** Comma-separated readings, most common first, e.g. "cháng, zhǎng". */
  pinyin: string;
  meaning: string;
  radical: string | null;
  strokeCount: number;
  /** HSK 3.0 level 1–7 (7 covers levels 7–9), or null if not in the HSK lists. */
  hskLevel: number | null;
  /** Word-frequency rank (lower = more common), or null if unknown. */
  freq: number | null;
};

/**
 * Stroke geometry in Make Me a Hanzi coordinates: a 1024×1024 box with x in [0, 1024]
 * and y in [-124, 900], y pointing *up*.
 */
export type StrokeData = {
  /** SVG path outline of each stroke, in stroke order. */
  strokes: string[];
  /** Centre line of each stroke, in drawing direction. */
  medians: Point[][];
};

export type CharacterData = CharacterInfo & StrokeData;

export type Topic = { id: string; name: string; emoji: string };
