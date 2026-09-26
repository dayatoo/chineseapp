/**
 * @jest-environment node
 */
import type { Point } from '@/data/types';

import { subdivideCurve } from '../geometry';
import { matchStroke } from '../matcher';

/** Real stroke medians from hanzi-writer-data, as points. */
function medians(char: string): Point[][] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(`hanzi-writer-data/${char}.json`) as { medians: [number, number][][] };
  return data.medians.map((m) => m.map(([x, y]) => ({ x, y })));
}

/** Simulates a finger: densely sampled points along the median, with a little wobble. */
function draw(median: Point[], offset: Point = { x: 0, y: 0 }, wobble = 6): Point[] {
  return subdivideCurve(median, 12).map((p, i) => ({
    x: p.x + offset.x + (i % 2 ? wobble : -wobble),
    y: p.y + offset.y,
  }));
}

const reverse = (points: Point[]) => [...points].reverse();

describe('matchStroke', () => {
  const chars = ['一', '十', '口', '水', '我', '永'];

  it.each(chars)('accepts every stroke of %s drawn in order', (char) => {
    const m = medians(char);
    m.forEach((median, i) => {
      expect(matchStroke(draw(median), m, i)).toEqual({ ok: true });
      expect(matchStroke(draw(median), m, i, { outlineVisible: true })).toEqual({ ok: true });
    });
  });

  it('rejects a stroke drawn backwards', () => {
    const m = medians('一');
    expect(matchStroke(reverse(draw(m[0])), m, 0)).toEqual({ ok: false, reason: 'backwards' });
    const shi = medians('十');
    expect(matchStroke(reverse(draw(shi[1])), shi, 1)).toEqual({ ok: false, reason: 'backwards' });
  });

  it('rejects the right stroke in the wrong place', () => {
    const m = medians('十');
    const result = matchStroke(draw(m[1], { x: 300, y: 0 }), m, 1, { outlineVisible: true });
    expect(result).toEqual({ ok: false, reason: 'wrong-place' });
  });

  it('rejects strokes drawn in the wrong order', () => {
    // 十: horizontal first, then vertical. Drawing the vertical first is wrong.
    const shi = medians('十');
    expect(matchStroke(draw(shi[1]), shi, 0)).toEqual({ ok: false, reason: 'wrong-order' });

    // 口: the closing bottom stroke drawn before the side strokes.
    const kou = medians('口');
    expect(matchStroke(draw(kou[2]), kou, 0)).toEqual({ ok: false, reason: 'wrong-order' });
  });

  it('rejects a tap or tiny line', () => {
    const m = medians('一');
    expect(matchStroke([m[0][0]], m, 0)).toEqual({ ok: false, reason: 'too-short' });
    expect(matchStroke([m[0][0], { x: m[0][0].x + 5, y: m[0][0].y }], m, 0)).toEqual({
      ok: false,
      reason: 'too-short',
    });
  });

  it('rejects a stroke that only covers part of the line', () => {
    const m = medians('一');
    const start = m[0][0];
    const partial = draw([start, { x: start.x + 150, y: start.y }]);
    expect(matchStroke(partial, m, 0).ok).toBe(false);
  });

  it('rejects a clearly different shape', () => {
    const m = medians('一');
    // a vertical line through the middle of the horizontal stroke
    const vertical = draw([
      { x: 500, y: 700 },
      { x: 500, y: 200 },
    ]);
    expect(matchStroke(vertical, m, 0).ok).toBe(false);
  });

  it('is more forgiving with higher leniency', () => {
    const m = medians('十');
    const sloppy = draw(m[0], { x: 0, y: 140 }, 20);
    expect(matchStroke(sloppy, m, 0, { leniency: 0.7, outlineVisible: true }).ok).toBe(false);
    expect(matchStroke(sloppy, m, 0, { leniency: 1.4 }).ok).toBe(true);
  });
});
