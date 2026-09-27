/**
 * @jest-environment node
 */
import { moveItem } from '../customSets';
import { type CharProgress, nextBox, useProgress, weakCharacters } from '../progress';

const p = (box: number, attempts: number, misses: number, lastPracticed = 0): CharProgress => ({
  box,
  attempts,
  misses,
  clean: 0,
  lastPracticed,
});

describe('nextBox', () => {
  it('moves up on a clean trace, down on 2+ misses, stays on 1 miss', () => {
    expect(nextBox(0, 0)).toBe(1);
    expect(nextBox(5, 0)).toBe(5);
    expect(nextBox(3, 1)).toBe(3);
    expect(nextBox(3, 2)).toBe(2);
    expect(nextBox(0, 4)).toBe(0);
  });
});

describe('weakCharacters', () => {
  it('lists unlearned characters, weakest first', () => {
    const weak = weakCharacters({
      我: p(2, 4, 1),
      你: p(0, 2, 6),
      他: p(0, 2, 1),
      好: p(4, 5, 0),
    });
    expect(weak).toEqual(['你', '他', '我']);
  });
});

describe('moveItem', () => {
  it('moves an item and ignores out-of-range targets', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});

describe('recordPhrase', () => {
  it('counts attempts and clean attempts per phrase', () => {
    const { recordPhrase } = useProgress.getState();
    recordPhrase('你好！', 2);
    recordPhrase('你好！', 0);
    expect(useProgress.getState().phrases['你好！']).toMatchObject({ attempts: 2, clean: 1 });
    useProgress.getState().reset();
    expect(useProgress.getState().phrases).toEqual({});
  });
});
