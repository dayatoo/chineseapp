import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './storage';

export type CharProgress = {
  /** Times the character has been completed. */
  attempts: number;
  /** Completions with no wrong strokes. */
  clean: number;
  /** Total wrong strokes across all attempts. */
  misses: number;
  /** Leitner box 0–5: up one for a clean trace, down one for 2+ misses. */
  box: number;
  lastPracticed: number;
};

export type PhraseProgress = {
  /** Times the phrase has been written out in full. */
  attempts: number;
  /** Times it was written without a wrong stroke. */
  clean: number;
  lastPracticed: number;
};

export const MAX_BOX = 5;
/** Characters in this box or above count as learned. */
export const LEARNED_BOX = 3;

type ProgressStore = {
  chars: Record<string, CharProgress>;
  /** Keyed by the phrase text. */
  phrases: Record<string, PhraseProgress>;
  /** Where "Continue" on the Home screen picks up. */
  lastLesson: { id: string; index: number } | null;
  recordResult: (char: string, misses: number) => void;
  recordPhrase: (zh: string, misses: number) => void;
  setLastLesson: (id: string, index: number) => void;
  reset: () => void;
};

export function nextBox(box: number, misses: number): number {
  if (misses === 0) return Math.min(MAX_BOX, box + 1);
  if (misses >= 2) return Math.max(0, box - 1);
  return box;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      chars: {},
      phrases: {},
      lastLesson: null,
      recordResult: (char, misses) =>
        set((state) => {
          const prev = state.chars[char] ?? {
            attempts: 0,
            clean: 0,
            misses: 0,
            box: 0,
            lastPracticed: 0,
          };
          return {
            chars: {
              ...state.chars,
              [char]: {
                attempts: prev.attempts + 1,
                clean: prev.clean + (misses === 0 ? 1 : 0),
                misses: prev.misses + misses,
                box: nextBox(prev.box, misses),
                lastPracticed: Date.now(),
              },
            },
          };
        }),
      recordPhrase: (zh, misses) =>
        set((state) => {
          const prev = state.phrases[zh] ?? { attempts: 0, clean: 0, lastPracticed: 0 };
          return {
            phrases: {
              ...state.phrases,
              [zh]: {
                attempts: prev.attempts + 1,
                clean: prev.clean + (misses === 0 ? 1 : 0),
                lastPracticed: Date.now(),
              },
            },
          };
        }),
      setLastLesson: (id, index) => set({ lastLesson: { id, index } }),
      reset: () => set({ chars: {}, phrases: {}, lastLesson: null }),
    }),
    { name: 'progress', storage: persistStorage, version: 1 },
  ),
);

/**
 * The practised characters most in need of review: lowest box first, then worst miss rate,
 * then least recently practised.
 */
export function weakCharacters(chars: Record<string, CharProgress>, limit = 8): string[] {
  return Object.entries(chars)
    .filter(([, p]) => p.box < LEARNED_BOX)
    .sort(
      ([, a], [, b]) =>
        a.box - b.box ||
        b.misses / b.attempts - a.misses / a.attempts ||
        a.lastPracticed - b.lastPracticed,
    )
    .slice(0, limit)
    .map(([char]) => char);
}

export function summarize(chars: Record<string, CharProgress>) {
  const all = Object.values(chars);
  const attempts = all.reduce((n, p) => n + p.attempts, 0);
  const clean = all.reduce((n, p) => n + p.clean, 0);
  return {
    practised: all.length,
    learned: all.filter((p) => p.box >= LEARNED_BOX).length,
    attempts,
    /** Share of completed characters traced without a single wrong stroke. */
    accuracy: attempts ? clean / attempts : 0,
  };
}
